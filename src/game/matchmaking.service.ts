import { Injectable, UnauthorizedException } from "@nestjs/common";
import { WebSocketServer } from "@nestjs/websockets";
import { Status } from "@prisma/client";
import { Server } from "socket.io";
import { UserIdToSockets } from "src/users/userIdToSockets.service";
import { UsersService } from "src/users/users.service";
import GameService from "./game.service";
import { GamesRequest } from "./interfaces/game.interface";

interface UserInQueue {
	id: string;
	bonus: boolean;
}

@Injectable()
export class MatchmakingService {
	constructor(
		private readonly GameService: GameService,
		private readonly _usersService: UsersService,
	) {}

	private _matchmakingQueue: UserInQueue[] = [];
	private _gamesRequest: GamesRequest[] = [];

	private _gameRequestTimer: number = 10000;

	join(userID: string, server: Server, bonus: boolean): void {
		if (this.get(userID))
			return;

		const opponent = this.searchOpponent(userID, bonus);
		if (opponent)
			this.createGameRequest(userID, opponent.id, true, server, bonus);
		else {
			this._matchmakingQueue.push({ id: userID, bonus: bonus });
			UserIdToSockets.emit(userID, server, "joined_queue");
		}

		server.to("matchmaking").emit("matchmaking_queue_count", this.count());
	}

	leave(userID: string, server: Server): void {
		const gameRequest = this.getGameRequest(userID, true);
		if (gameRequest) {
			let opponentID: string;
			if (gameRequest.sender.id === userID) opponentID = gameRequest.receiver.id;
			else opponentID = gameRequest.sender.id;

			this.join(opponentID, server, gameRequest.bonus);

			this.deleteGameRequest(userID, server, true);
		}

		if (!this.get(userID)) return;
		this._matchmakingQueue = this._matchmakingQueue.filter((user) => user.id !== userID);

		UserIdToSockets.emit(userID, server, "left_queue");
		server.to("matchmaking").emit("matchmaking_queue_count", this.count());
	}

	get(userID: string): boolean {
		return this._matchmakingQueue.find((user) => user.id === userID) ? true : false;
	}

	getAll(): UserInQueue[] {
		return this._matchmakingQueue;
	}

	count(): { bonus: number, normal: number } {
		const bonusCount = this._matchmakingQueue.filter((user) => user.bonus).length;

		return {
			bonus: bonusCount,
			normal: this._matchmakingQueue.length - bonusCount
		};
	}

	async createGameRequest(
		userID: string,
		opponentID: string,
		inMatchmaking: boolean,
		server: Server,
		bonus: boolean
	): Promise<void>{
		if (this.getGameRequest(userID, inMatchmaking)) {
			UserIdToSockets.emit(userID, server, "game_request_error", "Game request already sent");
			return;
		}

		this._gamesRequest.push({
			sender: { id: userID, accept: inMatchmaking ? false : true },
			receiver: { id: opponentID, accept: false },
			bonus: bonus,
			matchmaking: inMatchmaking,
			timeup: Date.now() + this._gameRequestTimer,
			startTime: Date.now(),

			timer: setTimeout(() => {
				const gameRequest = this.getGameRequest(userID, inMatchmaking);
				if (!gameRequest)
					return;
				
				if (inMatchmaking) {
					if (gameRequest.sender.accept) this.join(gameRequest.sender.id, server, bonus);
					else UserIdToSockets.emit(gameRequest.sender.id, server, "left_queue")
					
					if (gameRequest.receiver.accept) this.join(gameRequest.receiver.id, server, bonus);
					else UserIdToSockets.emit(gameRequest.receiver.id, server, "left_queue")
				}
				
				UserIdToSockets.emit(gameRequest.receiver.id, server, "game_request_timeup", { id: gameRequest.sender.id });
				this.deleteGameRequest(userID, server, inMatchmaking);
			}, this._gameRequestTimer)
		});

		if (inMatchmaking) {
			UserIdToSockets.emit(opponentID, server, "game_request");
			UserIdToSockets.emit(userID, server, "game_request");
		} else {
			const sender = await this._usersService.getUser({ id: userID }, "id,username,avatar,status");
			UserIdToSockets.emit(opponentID, server, "private_game_request", {
				id: sender.id,
				username: sender.username,
				avatar: sender.avatar,
				status: sender.status,
				timeup: Date.now() + this._gameRequestTimer
			});
			const receiver = await this._usersService.getUser({ id: userID }, "id,username,avatar,status");
			UserIdToSockets.emit(userID, server, "private_game_request_submitted", {
				id: receiver.id,
				username: receiver.username,
				avatar: receiver.avatar,
			});
		}
	}

	deleteGameRequest(userID: string, server: Server, inMatchmaking: boolean): void {
		const gameRequest = this.getGameRequest(userID, inMatchmaking);

		if (!gameRequest) {
			UserIdToSockets.emit(userID, server, "game_request_not_found");
			return;
		}

		clearTimeout(gameRequest.timer);
		this._gamesRequest.splice(this._gamesRequest.indexOf(gameRequest), 1);
	}

	async acceptGameRequest(userID: string, server: Server, inMatchmaking: boolean): Promise<void> {
		const gameRequest = this.getGameRequest(userID, inMatchmaking);

		if (!gameRequest) return;

		if (!inMatchmaking) {
			gameRequest.receiver.accept = true;

			const gameCreated = await this.GameService.create(gameRequest.sender.id, gameRequest.receiver.id, server, gameRequest.bonus);
			
			const sender = await this._usersService.getUser({ id: gameRequest.sender.id }, "status");
			const receiver = await this._usersService.getUser({ id: gameRequest.receiver.id }, "id,username,avatar,status");

			if (!gameCreated) {
				gameRequest.receiver.accept = false;

				if (sender.status === Status.INGAME)
					UserIdToSockets.emit(gameRequest.receiver.id, server, "game_request_error", "Opponent is in game");
				else if (sender.status === Status.OFFLINE)
					UserIdToSockets.emit(gameRequest.receiver.id, server, "game_request_error", "Opponent is offline");
			} else {				
				UserIdToSockets.emit(gameRequest.sender.id, server, "game_request_accepted", receiver);
				UserIdToSockets.emit(gameRequest.receiver.id, server, "game_request_accept", { id: gameRequest.sender.id });

				this.deleteGameRequest(userID, server, inMatchmaking);
			}
		} else {
			if (gameRequest.sender.id === userID) gameRequest.sender.accept = true;
			else gameRequest.receiver.accept = true;

			UserIdToSockets.emit(userID, server, "accepted_game_request");

			if (gameRequest.receiver.accept && gameRequest.sender.accept) {
				await this.GameService.create(gameRequest.sender.id, gameRequest.receiver.id, server, gameRequest.bonus);

				UserIdToSockets.emit(gameRequest.sender.id, server, "game_accepted");
				UserIdToSockets.emit(gameRequest.receiver.id, server, "game_accepted");
				
				this.deleteGameRequest(userID, server, inMatchmaking);
			}
		}
	}

	async declineGameRequest(userID: string, inMatchmaking: boolean, server: Server): Promise<void> {
		const gameRequest = this.getGameRequest(userID, inMatchmaking);

		if (!gameRequest)
			return;

		this.deleteGameRequest(userID, server, inMatchmaking);
		if (inMatchmaking) {
			if (gameRequest.sender.id === userID) {
				this.join(gameRequest.receiver.id, server, gameRequest.bonus);
				UserIdToSockets.emit(gameRequest.receiver.id, server, "game_canceled");
			} else {
				this.join(gameRequest.sender.id, server, gameRequest.bonus);
				UserIdToSockets.emit(gameRequest.sender.id, server, "game_canceled");
			}
		} else {
			const receiver = await this._usersService.getUser({ id: gameRequest.receiver.id }, "id,username,avatar");
			UserIdToSockets.emit(gameRequest.sender.id, server, "game_request_declined", receiver);
			UserIdToSockets.emit(gameRequest.receiver.id, server, "game_request_decline", { id: gameRequest.sender.id });
		}
	}

	searchOpponent(userID: string, bonus: boolean): UserInQueue | undefined {
		const opponent = this._matchmakingQueue.find(user => user.bonus === bonus && user.id !== userID);
		if (!opponent)
			return undefined;
	
		this._matchmakingQueue.splice(this._matchmakingQueue.indexOf(opponent), 1);
		return opponent;
	}

	getGameRequest(userID: string, inMatchmaking: boolean): GamesRequest {
		return this._gamesRequest.find((gameRequest) => (gameRequest.sender.id === userID || gameRequest.receiver.id === userID) && gameRequest.matchmaking === inMatchmaking);
	}

	getGameRequests(userID: string, inMatchmaking: boolean): { sender: string, receiver: string, bonus: boolean, startTime: number, timeup: number }[] {
		return this._gamesRequest.filter((gameRequest) => gameRequest.receiver.id === userID && gameRequest.matchmaking === inMatchmaking).map(gameRequest => {
			return {
				sender: gameRequest.sender.id,
				receiver: gameRequest.receiver.id,
				bonus: gameRequest.bonus,
				startTime: gameRequest.startTime,
				timeup: gameRequest.timeup
			}
		})
	}
}