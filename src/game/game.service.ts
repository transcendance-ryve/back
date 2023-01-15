import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { User } from "@prisma/client";
import { Socket, Server } from "socket.io";
import { Pong } from "./entities/Pong.entities";
import { UserIdToSockets } from "src/users/userIdToSockets.service";
import { UsersService } from "src/users/users.service";
import { Players, StartInfo, EndGamePlayer } from "./interfaces/game.interface";
import { v4 as uuidv4 } from 'uuid';


@Injectable()
export class GameService {
	constructor(
		private readonly _prismaService: PrismaService,
		private readonly _usersService: UsersService,
		) {}
	
	playerIds: string[] = [];
	playerIdToGame: Map<string, Pong> = new Map();
	gameIdToGame: Map<string, Pong> = new Map();
	private spectateRoom: string = uuidv4();

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

	async getGameHistory(userId: string,
		search: string,
		order: string,
		page?: number,
		take?: number,
		) {
		const games = await this._prismaService.game.findMany({
			where: {
				AND: [
					{
						OR: [
							{
								player_one_id: userId,
							},
							{
								player_two_id: userId,
							},
						],
					},
					{
						OR: [
							{
								player_one: {
										username: {
											contains: search,
											mode: 'insensitive'
										},
									},
							},
							{
								player_two: {
									username: {
										contains: search,
										mode: 'insensitive'
									},
								},
							},
						],
					},
				],
			},
			skip: (page - 1) * take || undefined,
			take: take || 20,
			orderBy: { createdAt: order === 'asc' ? 'asc' : 'desc' } ,
			select: {
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
		const res = [];
		for (const game of games) {
			res.push({
				left: {
					...game.player_one,
					score: game.player_one_score,
				},
				right: {
					...game.player_two,
					score: game.player_two_score,
				}
			});
		}
		return res;
	}

	async getGameHistoryCount(userId: string) {
		console.log(userId);
		const games = await this._prismaService.user.findFirst({
			where: {
				id: userId
			},
			select: {
				played: true,
			}
		});
		return games.played;
	}

	async getCurrentGame(
		order: string,
		page: number,
		take: number,
		search?: string,
	): Promise<any> {
		const games = []; 
		let res = [];
		for (const game of this.gameIdToGame.entries())
		{
			games.push(game);
		}
		for (let i = (page - 1) * take; i < page * take; i++)
		{
			if (i >= games.length)
				break;
			let player: Players = await this.getPlayers(games[i][1].leftPlayer.id, games[i][1].rightPlayer.id);
			if (!search || search && player.left.username.toLowerCase().includes(search.toLowerCase()) 
				|| player.right.username.toLowerCase().includes(search.toLowerCase()))
			{
				player = {
					left: {
						...player.left,
						score: games[i][1].game.leftScore,
					},
					right: {
						...player.right,
						score: games[i][1].game.rightScore,
					},
				}
				res.push({
					id: games[i][1].game.gameId,
					players: player,
				});
			}
		}
		if (order === 'desc')
			res = res.reverse();
		return {res, count: games.length};
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
		const gameId: string = uuidv4();
		const game: Pong =  new Pong(gameId, id, opponent, server, this);
		this.playerIdToGame.set(id, game);
		this.playerIdToGame.set(opponent, game);
		this.gameIdToGame.set(gameId, game);
		const PlayerOneSocket: Socket = UserIdToSockets.get(id);
		const PlayerTwoSocket: Socket = UserIdToSockets.get(opponent);
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
		server.to(game.game.gameId).emit("start", res);
		this.emitNewGameToSpectate(game, players, server);
		game.launchGame();
		return;
	}

	emitNewGameToSpectate(game: Pong, players: Players, server: Server): void {
		const res = {
			id: game.game.gameId,
			players,
		}
		server.to(this.spectateRoom).emit("newGameStarted", res);
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

	async endGame(playerOne: EndGamePlayer, playerTwo: EndGamePlayer, server: Server): Promise<string> 
 	{
		try {
			const game: Pong = this.playerIdToGame.get(playerOne.id);
			server.to(this.spectateRoom).emit("gameEnded", game.game.gameId);	
			if (!game) {
				throw new Error("Game not found");
			}
			await this._prismaService.game.create({
				data: {
					id: game.game.gameId,
					player_one: { connect: { id: playerOne.id } },
					player_one_score: playerOne.score,
					player_two: { connect: { id: playerTwo.id } },
					player_two_score: playerTwo.score,
				}
			});
			this.playerIdToGame.delete(playerOne.id);
			this.playerIdToGame.delete(playerTwo.id);
			//this.gameIdToGame.delete(game.game.gameId);
			const WinnerId: string = playerOne.win ? playerOne.id : playerTwo.id;
			await this._usersService.addExperience(WinnerId, 20);
			await this._usersService.addRankPoint(WinnerId, true);

			const playerUpdated: Partial<User> = await this._usersService.updateUser({id: WinnerId},
				{wins:{ increment: 1}, played:{increment: 1} } );
			const WinnerSocket: Socket = UserIdToSockets.get(WinnerId);
			server.to(WinnerSocket.id).emit("updateUser", playerUpdated);
			let looserSocket: Socket;
			if (playerOne.win) {
				const updatedPlayerTwo: Partial<User> =  await this._usersService.updateUser({id: playerTwo.id},
					{loses:{ increment: 1}, played:{increment: 1}});
				looserSocket = UserIdToSockets.get(playerTwo.id);
				server.to(looserSocket.id).emit("updateUser", updatedPlayerTwo);
			} else {
				const updatedPlayerOne: Partial<User> = await this._usersService.updateUser({id: playerOne.id},
					{loses:{ increment: 1}, played:{increment: 1}});
				looserSocket = UserIdToSockets.get(playerOne.id);
				server.to(looserSocket.id).emit("updateUser", updatedPlayerOne);
			}
			looserSocket.leave(game.game.gameId);
			WinnerSocket.leave(game.game.gameId);

		} catch (err) {
			console.log(err);
			return err.message;
		}
	}

	async  onSpectate(id: string, userSocket: Socket): Promise<void> {
		userSocket.join(this.spectateRoom);
		console.log("user joined spcetate room");
	}

	async offSpectate(id: string, userSocket: Socket): Promise<void> {
		userSocket.leave(this.spectateRoom);
		console.log("user left spcetate room");
	}

	async spectateGame(gameId: string, userSocket: Socket, server: Server): Promise<void> {
		const game: Pong = this.gameIdToGame.get(gameId);
		if (game) {
			const players: Players = await this.getPlayers(game.leftPlayer.id, game.rightPlayer.id);
			const width: number  = 790;
			const height: number = 390;
			const res: StartInfo = {
				players,
				width,
				height,
			}
			server.to(userSocket.id).emit("start", res);
			userSocket.join(game.game.gameId);
		}
	}

	async leaveSpectateGame(gameId: string, userSocket: Socket): Promise<void> {
		const game: Pong = this.gameIdToGame.get(gameId);
		if (game) {
			userSocket.leave(game.game.gameId);
		}
	}

	async leave(id: string): Promise<void> {}

	async reconnect(id: string): Promise<void> {}

	//Utils

}