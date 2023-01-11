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

	join(id: string): void {
		if (this.get(id))
			throw new UnauthorizedException("Already in matchmaking queue");

		if (this._matchmakingQueue.length >= 1)
			this.createGameRequest(id, true);
		else this._matchmakingQueue.push(id);

		UserIdToSockets.get(id).emit("joined_queue");
	}

	leave(id: string): void {
		if (!this.get(id))
			throw new UnauthorizedException("Not in matchmaking queue");

		this._matchmakingQueue.splice(this._matchmakingQueue.indexOf(id), 1);

		const gameRequest = this.getGameRequest(id);
		if (gameRequest) {
			this.deleteGameRequest(id);

			let opponentID: string;
			if (gameRequest.sender.id === id) opponentID = gameRequest.receiver.id;
			else opponentID = gameRequest.sender.id;

			UserIdToSockets.get(opponentID).emit("game_canceled");
			this.join(opponentID);
		}

		UserIdToSockets.get(id).emit("left_queue");
	}

	get(id: string): boolean {
		return this._matchmakingQueue.includes(id);
	}

	getAll(): string[] {
		return this._matchmakingQueue;
	}

	count(): number {
		return this._matchmakingQueue.length;
	}

	createGameRequest(id: string, inMatchmaking: boolean): void {
		const opponent = this._matchmakingQueue.shift();

		this._gamesRequest.push({
			sender: { id, accept: false },
			receiver: { id: opponent, accept: false },
			
			timer: this._gameRequestTimer
		});

		setTimeout(() => {
			this.declineGameRequest(id, inMatchmaking);
		}, this._gameRequestTimer)

		UserIdToSockets.get(opponent).emit("found_opponent", { id });
		UserIdToSockets.get(id).emit("found_opponent", { id: opponent });
	}

	deleteGameRequest(id: string): void {
		const gameRequest = this.getGameRequest(id);

		if (!gameRequest) {
			UserIdToSockets.get(id).emit("game_request_not_found");
			return;
		}

		this._gamesRequest.splice(this._gamesRequest.indexOf(gameRequest), 1);
	}

	acceptGameRequest(id: string): void {
		const gameRequest = this.getGameRequest(id);

		if (!gameRequest) {
			UserIdToSockets.get(id).emit("game_request_not_found");
			return;
		}

		if (gameRequest.sender.id === id) gameRequest.sender.accept = true;
		else gameRequest.receiver.accept = true;

		if (gameRequest.receiver.accept && gameRequest.sender.accept) {
			UserIdToSockets.get(gameRequest.sender.id).emit("game_accepted");
			UserIdToSockets.get(gameRequest.receiver.id).emit("game_accepted");

			this.deleteGameRequest(id);

			// TODO: Create game
		}
	}

	declineGameRequest(id: string, inMatchmaking: boolean): void {
		const gameRequest = this.getGameRequest(id);

		if (!gameRequest)
			throw new UnauthorizedException("No game request found");
		
		UserIdToSockets.get(gameRequest.sender.id).emit("game_canceled");
		UserIdToSockets.get(gameRequest.receiver.id).emit("game_canceled");

		if (inMatchmaking) {
			if (gameRequest.sender.id === id) this.join(gameRequest.receiver.id);
			else this.join(gameRequest.sender.id);
		}

		this.deleteGameRequest(id);
	}

	getGameRequest(id: string): GamesRequest {
		return this._gamesRequest.find((gameRequest) => {
			return gameRequest.sender.id === id || gameRequest.receiver.id === id;
		});
	}
}