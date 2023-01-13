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
	playerMap: Map<string, Pong> = new Map<string, Pong>();
	size: number = 0;

	getGame(userId: string): Pong | undefined{
		const game: Pong = this.playerMap.get(userId);
		if (game) {
			return game;
		}
		return undefined;
	}

	createGame(playerOne: string, playerTwo: string, server: Server): Pong {
		const game: Pong = new Pong(playerOne, playerTwo, server);
		this.playerMap.set(playerOne, game);
		this.playerMap.set(playerTwo, game);
		this.size += 2;
		return game;
	}

	keyPress(userId: string, key: string): void {
		const game: Pong = this.playerMap.get(userId);
		if (game) {
			game.keyDown(key, userId);
		}
	}

	keyRelease(userId: string, key: string): void {
		const game: Pong = this.playerMap.get(userId);
		if (game) {
			game.keyUp(key, userId);
		}
	}
}