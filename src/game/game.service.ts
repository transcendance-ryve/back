import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { Socket } from "socket.io";
import { Pong } from "./Pong/ClassPong";
import { GameSessions } from "./entities/gamesSessions.entity";
import { Server } from "socket.io";
import { UserIdToSockets } from "src/users/userIdToSockets.service";

interface Player {
	id: string,
	username: string,
	avatar: string,
	/*score: number,
	level: number,
	experience: number,
	next_level: number,*/
}

interface Players {
	left: Player,
	right: Player,
}

@Injectable()
export class GameService {
	constructor(
		private readonly _prismaService: PrismaService,
		) {}
	private readonly _games: GameSessions = new GameSessions();
		
	playerIds: string[] = [];
	async connect(id: string, server: Server): Promise<void> {
		this.playerIds.push(id);
		console.log(this.playerIds.length);
		if (this.playerIds.length === 2) {
			const playerOne = this.playerIds[0];
			const playerTwo = this.playerIds[1];
			this.playerIds = [];
			await this.create(playerOne, playerTwo, server);
		}
	}

	async create(id: string, opponent: string, server: Server): Promise<Pong> {
		await this._prismaService.game.create({
			data: {
				player_one: { connect: { id } },
				player_one_score: 0,
				player_two: { connect: { id: opponent } },
				player_two_score: 0
			}
		});

		//const game: Game = new Game(server);
		const game: Pong = this._games.createGame(id, opponent, server);
		console.log("size of sessions: " + this._games.getSize());
		const PlayerOneSocket: Socket= UserIdToSockets.get(id);
		const PlayerTwoSocket: Socket= UserIdToSockets.get(opponent);
		PlayerOneSocket.join(game.gameId);
		PlayerTwoSocket.join(game.gameId);
		const playerOne = await this._prismaService.user.findUnique({
			where: {
				id
			},
			select: {
				id: true,
				username: true,
				avatar: true,
			},
		});
		const playerTwo = await this._prismaService.user.findUnique({
			where: {
				id: opponent
			},
			select: {
				id: true,
				username: true,
				avatar: true,
			},
		});
		const players: Players = {
			left: playerOne,
			right: playerTwo,
		}
		const width: number  = 790;
		const height: number = 390;
		const res = {
			players,
			width,
			height,
		}
		server.to(game.gameId).emit("start", res);
		game.launchGame();
		return;
	}

	keyPress(userId: string, key: string): void {
		const game: Pong = this._games.getGame(userId);
		if (game) {
			console.log("mes morts!");
			game.keyDown(key, userId);
		}
	}

	keyRelease(userId: string, key: string): void {
		const game: Pong = this._games.getGame(userId);
		if (game) {
			game.keyUp(key, userId);
		}
	}

	async leave(id: string): Promise<void> {}

	async reconnect(id: string): Promise<void> {}

	async spectate(id: string): Promise<void> {}


}