import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { Socket } from "socket.io";
import { Pong } from "./entities/Pong.entities";
import { Server } from "socket.io";
import { UserIdToSockets } from "src/users/userIdToSockets.service";
import { UsersService } from "src/users/users.service";
import { Players, StartInfo, EndGamePlayer } from "./interfaces/game.interface";


@Injectable()
export class GameService {
	constructor(
		private readonly _prismaService: PrismaService,
		private readonly _usersService: UsersService,
		) {}
	
	playerIds: string[] = [];
	playerIdToGame: Map<string, Pong> = new Map();

	//Getter
	async getPlayers(playerOne : string, playerTwo: string): Promise<Players> {
		const playerOneData = await this._prismaService.user.findUnique({
			where: {
				id: playerOne
			},
			select: {
				id: true,
				username: true,
				avatar: true,
				level: true,
				experience: true,
				next_level: true,
			}
		});
		const playerTwoData = await this._prismaService.user.findUnique({
			where: {
				id: playerTwo
			},
			select: {
				id: true,
				username: true,
				avatar: true,
				level: true,
				experience: true,
				next_level: true,
			}
		});
		return {
			left: {
				score: 0,
				...playerOneData
			},
			right:{
				score: 0,
				...playerTwoData
			}
		}
	}

	async getGameHistory(userId: string): Promise<any> {
		const games = await this._prismaService.game.findMany({
			where: {
				OR: [
					{
						player_one_id: userId,
					},
					{
						player_two_id: userId,
					}
				]
			},
			select: {
				id: true,
				player_one_id: true,
				player_two_id: true,
				player_one_score: true,
				player_two_score: true,
				player_one: {
					select: {
						id: true,
						username: true,
						avatar: true,
					}
				},
				player_two: {
					select: {
						id: true,
						username: true,
						avatar: true,
					}
				}
			}
		});
		return games;
	}

	//Actions
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
		const gameId = await this._prismaService.game.create({
			data: {
				player_one: { connect: { id } },
				player_one_score: 0,
				player_two: { connect: { id: opponent } },
				player_two_score: 0
			},
			select: {
				id: true
			},
		});
		const toGameId : string = gameId.id;
		const game: Pong =  new Pong(toGameId, id, opponent, server, this);
		console.log(game.game.gameId);
		this.playerIdToGame.set(id, game);
		this.playerIdToGame.set(opponent, game);
		const PlayerOneSocket: Socket= UserIdToSockets.get(id);
		const PlayerTwoSocket: Socket= UserIdToSockets.get(opponent);
		PlayerOneSocket.join(game.game.gameId);
		PlayerTwoSocket.join(game.game.gameId);
		const players: Players = await this.getPlayers(id, opponent);
		const width: number  = 790;
		const height: number = 390;
		const res: StartInfo = {
			players,
			width,
			height,
		}
		console.log(this.playerIdToGame.size);
		console.log(game.game.gameId);
		server.to(game.game.gameId).emit("start", res);
		game.launchGame();
		return;
	}

	keyPress(userId: string, key: string): void {
		const game: Pong = this.playerIdToGame.get(userId);
		if (game) {
			game.keyDown(key, userId);
		}
	}

	keyRelease(userId: string, key: string): void {
		const game: Pong = this.playerIdToGame.get(userId);
		if (game) {
			game.keyUp(key, userId);
		}
	}

	async endGame(playerOne: EndGamePlayer, playerTwo: EndGamePlayer)
 	{
		const game: Pong = this.playerIdToGame.get(playerOne.id);
		if (!game) {
			return "Game not found";
		}
		await this._prismaService.game.update({
			where: {
				id: game.game.gameId,
			},
			data: {
				player_one_score: playerOne.score,
				player_two_score: playerTwo.score,
				player_one_id: playerOne.id,
				player_two_id: playerTwo.id,
			}
		});
		this.playerIdToGame.delete(playerOne.id);
		this.playerIdToGame.delete(playerTwo.id);
		const WinnerId: string = playerOne.win ? playerOne.id : playerTwo.id;
		this._usersService.addExperience(WinnerId, 20);
		this._usersService.addRankPoint(WinnerId, true);
		await this._usersService.updateUser({id: WinnerId},
			{wins:{ increment: 1}, played:{increment: 1} } );
		if (playerOne.win) {	
			await this._usersService.updateUser({id: playerTwo.id},
				{loses:{ increment: 1}, played:{increment: 1}});
		} else {
			await this._usersService.updateUser({id: playerOne.id},
				{loses:{ increment: 1}, played:{increment: 1}});
		}

	}

	async leave(id: string): Promise<void> {}

	async reconnect(id: string): Promise<void> {}

	async spectate(id: string): Promise<void> {}
	//Utils

}