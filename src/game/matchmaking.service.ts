import { Injectable, UnauthorizedException } from "@nestjs/common";
import { UserIdToSockets } from "src/users/userIdToSockets.service";

interface GamesRequest {
	sender: {
		id: string,
		accept: boolean,
	},
	receiver: {
		id: string,
		accept: boolean,
	},

	timer: number,
}

@Injectable()
export class MatchmakingService {
	constructor() {}

	private _matchmakingQueue: string[] = [];
	private _gamesRequest: GamesRequest[] = [];

	private _gameRequestTimer: number = 10000;

	join(userID: string): void {
		if (this.get(userID))
			throw new UnauthorizedException("Already in matchmaking queue");

		if (this._matchmakingQueue.length >= 1)
			this.createGameRequest(userID, true);
		else this._matchmakingQueue.push(userID);

		UserIdToSockets.get(userID).emit("joined_queue");
	}

	leave(userID: string): void {
		if (!this.get(userID))
			throw new UnauthorizedException("Not in matchmaking queue");

		this._matchmakingQueue.splice(this._matchmakingQueue.indexOf(userID), 1);

		const gameRequest = this.getGameRequest(userID);
		if (gameRequest) {
			this.deleteGameRequest(userID);

			let opponentID: string;
			if (gameRequest.sender.id === userID) opponentID = gameRequest.receiver.id;
			else opponentID = gameRequest.sender.id;

			UserIdToSockets.get(opponentID).emit("game_canceled");
			this.join(opponentID);
		}

		UserIdToSockets.get(userID).emit("left_queue");
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

	createGameRequest(userID: string, inMatchmaking: boolean): void {
		const opponent = this._matchmakingQueue.shift();

		this._gamesRequest.push({
			sender: { id: userID, accept: false },
			receiver: { id: opponent, accept: false },
			
			timer: this._gameRequestTimer
		});

		setTimeout(() => {
			this.declineGameRequest(userID, inMatchmaking);
		}, this._gameRequestTimer)

		UserIdToSockets.get(opponent).emit("found_opponent", { userID });
		UserIdToSockets.get(userID).emit("found_opponent", { userID: opponent });
	}

	deleteGameRequest(userID: string): void {
		const gameRequest = this.getGameRequest(userID);

		if (!gameRequest) {
			UserIdToSockets.get(userID).emit("game_request_not_found");
			return;
		}

		this._gamesRequest.splice(this._gamesRequest.indexOf(gameRequest), 1);
	}

	acceptGameRequest(userID: string): void {
		const gameRequest = this.getGameRequest(userID);

		if (!gameRequest) {
			UserIdToSockets.get(userID).emit("game_request_not_found");
			return;
		}

		if (gameRequest.sender.id === userID) gameRequest.sender.accept = true;
		else gameRequest.receiver.accept = true;

		if (gameRequest.receiver.accept && gameRequest.sender.accept) {
			UserIdToSockets.get(gameRequest.sender.id).emit("game_accepted");
			UserIdToSockets.get(gameRequest.receiver.id).emit("game_accepted");

			this.deleteGameRequest(userID);

			// TODO: Create game
		}
	}

	declineGameRequest(userID: string, inMatchmaking: boolean): void {
		const gameRequest = this.getGameRequest(userID);

		if (!gameRequest)
			throw new UnauthorizedException("No game request found");
		
		UserIdToSockets.get(gameRequest.sender.id).emit("game_canceled");
		UserIdToSockets.get(gameRequest.receiver.id).emit("game_canceled");

		if (inMatchmaking) {
			if (gameRequest.sender.id === userID) this.join(gameRequest.receiver.id);
			else this.join(gameRequest.sender.id);
		}

		this.deleteGameRequest(userID);
	}

	getGameRequest(userID: string): GamesRequest {
		return this._gamesRequest.find((gameRequest) => {
			return gameRequest.sender.id === userID || gameRequest.receiver.id === userID;
		});
	}
}