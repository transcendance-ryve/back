import { Injectable, UnauthorizedException } from "@nestjs/common";
import { WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";
import { UserIdToSockets } from "src/users/userIdToSockets.service";
import { GameService } from "./game.service";
import { GamesRequest } from "./interfaces/game.interface";

@Injectable()
export class MatchmakingService {
	constructor(
		private readonly GameService: GameService,
	) {}

	private _matchmakingQueue: string[] = [];
	private _gamesRequest: GamesRequest[] = [];

	private _gameRequestTimer: number = 30000;

	join(userID: string, server: Server): void {
		if (this.get(userID))
			return;

		if (this._matchmakingQueue.length >= 1)
			this.createGameRequest(userID, true, server);
		else {
			this._matchmakingQueue.push(userID);
			UserIdToSockets.get(userID).emit("joined_queue");
		}
	}

	leave(userID: string, server: Server): void {
		if (!this.get(userID))
			return;

		this._matchmakingQueue.splice(this._matchmakingQueue.indexOf(userID), 1);

		const gameRequest = this.getGameRequest(userID);
		if (gameRequest) {
			this.deleteGameRequest(userID);

			let opponentID: string;
			if (gameRequest.sender.id === userID) opponentID = gameRequest.receiver.id;
			else opponentID = gameRequest.sender.id;

			this.join(opponentID, server);
		}

		server.to(UserIdToSockets.get(userID).id).emit("left_queue");
	}

	get(userID: string): boolean {
		return this._matchmakingQueue.includes(userID);
	}

	getAll(): string[] {
		return this._matchmakingQueue;
	}

	count(): number {
		return this._matchmakingQueue.length;
	}

	createGameRequest(userID: string, inMatchmaking: boolean, server: Server): void {
		const opponent = this._matchmakingQueue.shift();

		this._gamesRequest.push({
			sender: { id: userID, accept: false },
			receiver: { id: opponent, accept: false },
			
			timer: setTimeout(() => {
				const gameRequest = this.getGameRequest(userID);

				if (!gameRequest)
					return;
				
				if (gameRequest.sender.accept) this.join(gameRequest.sender.id, server);
				else server.to(UserIdToSockets.get(gameRequest.sender.id).id).emit("left_queue");
				
				if (gameRequest.receiver.accept) this.join(gameRequest.receiver.id, server);
				else server.to(UserIdToSockets.get(gameRequest.receiver.id).id).emit("left_queue");

				this.deleteGameRequest(userID);
			}, this._gameRequestTimer)
		});

		server.to(UserIdToSockets.get(opponent).id).emit("game_request");
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
					this.join(gameRequest.receiver.id, server)
					UserIdToSockets.get(gameRequest.receiver.id).emit("game_canceled");
				} else {
					this.join(gameRequest.sender.id, server);
					UserIdToSockets.get(gameRequest.sender.id).emit("game_canceled");
				}
			}

		this.deleteGameRequest(userID);
	}

	getGameRequest(userID: string): GamesRequest {
		return this._gamesRequest.find((gameRequest) => {
			return gameRequest.sender.id === userID || gameRequest.receiver.id === userID;
		});
	}
}