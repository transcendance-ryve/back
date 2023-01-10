import { Injectable } from "@nestjs/common";
import { Game } from "@prisma/client";
import { PrismaService } from "src/prisma.service";

@Injectable()
export class GameService {
	constructor(
		private readonly _prismaService: PrismaService
	) {}

	async create(id: string, opponent: string): Promise<Game> {
		const game = await this._prismaService.game.create({
			data: {
				player_one: { connect: { id } },
				player_one_score: 0,
				player_two: { connect: { id: opponent } },
				player_two_score: 0
			}
		});

		return game;
	}

	async get(id: string): Promise<Game> {
		const game = await this._prismaService.game.findUnique({
			where: { id }
		});

		return game;
	}

	async update(id: string, score: number): Promise<Game> {
		const game = await this._prismaService.game.update({
			where: { id },
			data: { player_one_score: score }
		});

		return game;
	}
}