import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { Socket } from "socket.io";
import { Game } from "./entities/Game";
import { Player } from "./entities/Player";

@Injectable()
export class GameService {
	constructor(
		private readonly _prismaService: PrismaService
	) {}

	private _games: Map<string, Game> = new Map();

	async create(id: string, opponent: string, server: Socket): Promise<Game> {
		await this._prismaService.game.create({
			data: {
				player_one: { connect: { id } },
				player_one_score: 0,
				player_two: { connect: { id: opponent } },
				player_two_score: 0
			}
		});

		const game: Game = new Game(server);
		this._games.set(id, game);

		return game;
	}


	async connect(id: string, socket: Socket, opponent: boolean): Promise<void> {
		const game: Game = this._games.get(id);
		
		const player = new Player(id, 0, 0)
		if (opponent) {
			game.setPlayerTwo(player);
		} else {
			game.setPlayerOne(player);
		}
	}

	async leave(id: string): Promise<void> {}

	async reconnect(id: string): Promise<void> {}

	async spectate(id: string): Promise<void> {}


}