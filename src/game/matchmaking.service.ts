import { Injectable, UnauthorizedException } from "@nestjs/common";
import { WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";
import { UserIdToSockets } from "src/users/userIdToSockets.service";
import { GameService } from "./game.service";
import { GamesRequest } from "./interfaces/game.interface";

interface UserInQueue {
	id: string;
	bonus: boolean;
}

@Injectable()
export class MatchmakingService {
	constructor(
		private readonly GameService: GameService,
	) {}

	private _matchmakingQueue: UserInQueue[] = [];
	private _gamesRequest: GamesRequest[] = [];

	private _gameRequestTimer: number = 30000;

	join(userID: string, server: Server, bonus: boolean): void {
		if (this.get(userID))
			return;

		const opponent = this.searchOpponent(userID, bonus);
		if (opponent)
			this.createGameRequest(userID, opponent, true, server, bonus);
		else {
			this._matchmakingQueue.push({ id: userID, bonus: bonus });
			UserIdToSockets.get(userID).emit("joined_queue");
		}

		server.emit("matchmaking_queue_count", this.count());
	}

	leave(userID: string, server: Server): void {
		const gameRequest = this.getGameRequest(userID);
		if (gameRequest) {
			
			let opponentID: string;
			if (gameRequest.sender.id === userID) opponentID = gameRequest.receiver.id;
			else opponentID = gameRequest.sender.id;
			
			this.join(opponentID, server, gameRequest.bonus);
			
			this.deleteGameRequest(userID);
		}

		if (!this.get(userID)) return;
		this._matchmakingQueue = this._matchmakingQueue.filter((user) => user.id !== userID);

		server.to(UserIdToSockets.get(userID).id).emit("left_queue");
		server.emit("matchmaking_queue_count", this.count());
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

	createGameRequest(userID: string, opponent: UserInQueue, inMatchmaking: boolean, server: Server, bonus: boolean): void {
		this._gamesRequest.push({
			sender: { id: userID, accept: false },
			receiver: { id: opponent.id, accept: false },
			bonus: bonus,
			
			timer: setTimeout(() => {
				const gameRequest = this.getGameRequest(userID);

				if (!gameRequest)
					return;
				
				if (gameRequest.sender.accept) this.join(gameRequest.sender.id, server, bonus);
				else server.to(UserIdToSockets.get(gameRequest.sender.id).id).emit("left_queue");
				
				if (gameRequest.receiver.accept) this.join(gameRequest.receiver.id, server, bonus);
				else server.to(UserIdToSockets.get(gameRequest.receiver.id).id).emit("left_queue");

				this.deleteGameRequest(userID);
			}, this._gameRequestTimer)
		});

		server.to(UserIdToSockets.get(opponent.id).id).emit("game_request");
		server.to(UserIdToSockets.get(userID).id).emit("game_request");
	}

	deleteGameRequest(userID: string): void {
		const gameRequest = this.getGameRequest(userID);


		if (!gameRequest) {
			UserIdToSockets.get(userID).emit("game_request_not_found");
			return;
		}

		clearTimeout(gameRequest.timer);
		this._gamesRequest.splice(this._gamesRequest.indexOf(gameRequest), 1);
	}

	acceptGameRequest(userID: string, server: Server): void {
		const gameRequest = this.getGameRequest(userID);

		if (!gameRequest) {
			return;
		}

		if (gameRequest.sender.id === userID) gameRequest.sender.accept = true;
		else gameRequest.receiver.accept = true;

		if (gameRequest.receiver.accept && gameRequest.sender.accept) {
			UserIdToSockets.get(gameRequest.sender.id).emit("game_accepted");
			UserIdToSockets.get(gameRequest.receiver.id).emit("game_accepted");

			this.deleteGameRequest(userID);

			this.GameService.create(gameRequest.sender.id, gameRequest.receiver.id, server);
		}

		server.to(UserIdToSockets.get(userID).id).emit("game_request_accepted");
	}

	declineGameRequest(userID: string, inMatchmaking: boolean, server: Server): void {
		const gameRequest = this.getGameRequest(userID);

		if (!gameRequest)
			return;

			UserIdToSockets.get(gameRequest.receiver.id).emit("game_canceled");
			
			if (inMatchmaking) {
				if (gameRequest.sender.id === userID) {
					this.join(gameRequest.receiver.id, server, gameRequest.bonus)
					UserIdToSockets.get(gameRequest.receiver.id).emit("game_canceled");
				} else {
					this.join(gameRequest.sender.id, server, gameRequest.bonus);
					UserIdToSockets.get(gameRequest.sender.id).emit("game_canceled");
				}
			}

		this.deleteGameRequest(userID);
	}

	searchOpponent(userID: string, bonus: boolean): UserInQueue | undefined {
		const opponent = this._matchmakingQueue.find(user => user.bonus === bonus && user.id !== userID);
		if (!opponent)
			return undefined;
	
		this._matchmakingQueue.splice(this._matchmakingQueue.indexOf(opponent), 1);
		return opponent;
	}

	getGameRequest(userID: string): GamesRequest {
		return this._gamesRequest.find((gameRequest) => {
			return gameRequest.sender.id === userID || gameRequest.receiver.id === userID;
		});
	}
}