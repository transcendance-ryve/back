import { Pong } from "../Pong/ClassPong";
import { Server, Socket } from "socket.io";

interface Player {
	id: string,
	username: string,
	avatar: string,
	score: number,
	level: number,
	experience: number,
	next_level: number,
}

interface Players {
	left: Player,
	right: Player,
}

export class GameSessions {
	playerMap = new Map();
	size: number = 0;

	getGame(userId: string): Pong | undefined{
		const game: Pong = this.playerMap.get(userId);
		if (game) {
			return game;
		}
		return undefined;
	}

	getSize(): number {
		return this.size;
	}

	createGame(playerOne: string, playerTwo: string, server: Server): Pong {
		const game: Pong = new Pong(playerOne, playerTwo, server);
		this.playerMap.set(playerOne, game);
		this.playerMap.set(playerTwo, game);
		this.size += 2;
		console.log("PlayerOne: " + playerOne);
		console.log("PlayerTwo: " + playerTwo);
		console.log("game created: " + game.gameId);
		console.log("game size: " + this.playerMap.size);
		return game;
	}

	keyRelease(userId: string, key: string): void {
		const game: Pong = this.playerMap.get(userId);
		if (game) {
			game.keyUp(key, userId);
		}
	}
}