import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { Game, User } from "@prisma/client";
import { Socket, Server } from "socket.io";
import { Pong } from "./entities/neoPong.entities";
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
	spectateRoom: string = uuidv4();
	userIdToTimeout: Map<string, NodeJS.Timeout> = new Map();

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
		for (const game of this.gameIdToGame.entries())
		{
			let player: Players = await this.getPlayers(game[1].leftPlayer.id, game[1].rightPlayer.id);
			const left: string = player.left.username.toLowerCase();
			const right: string = player.right.username.toLowerCase();
			if (!search || search && left.includes(search.toLowerCase()) 
				|| right.includes(search.toLowerCase()))
					games.push(game);
		}
		if (take > games.length)
			take = games.length;
		if (order === "desc")
			page = (games.length / take) - page;
		else
			page++;
		let res = await this.initCurrentGameArray(page, take, games);
		if (order === 'asc')
			res = res.reverse();	
		return {res, count: games.length};
	}

	async initCurrentGameArray(page: number, take: number, games):
	Promise<any> {
		let res = [];

		for (let i = (page - 1) * take; i < page * take; i++)
		{
			i = Math.floor(i);
			if (i < 0)
				i = 0;
			if (i >= games.length)
				break;
			let player: Players = await this.getPlayers(games[i][1].leftPlayer.id, games[i][1].rightPlayer.id);
			player = {
				left: {
					...player.left,
					username: i.toString(),
					score: games[i][1].leftPlayer.score,
				},
				right: {
					...player.right,
					score: games[i][1].rightPlayer.score,
				},
			}
			res.unshift({
				id: games[i][1].gameId,
				players: player,
			});
		}
		return res;
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
		console.log("game created : " + game.gameId);
		this.playerIdToGame.set(id, game);
		this.playerIdToGame.set(opponent, game);
		this.gameIdToGame.set(gameId, game);
		const PlayerOneSocket: Socket = UserIdToSockets.get(id);
		const PlayerTwoSocket: Socket = UserIdToSockets.get(opponent);
		PlayerOneSocket.join(game.gameId);
		PlayerTwoSocket.join(game.gameId);
		const players: Players = await this.getPlayers(id, opponent);
		const width: number  = 790;
		const height: number = 390;
		const res: StartInfo = {
			players,
			width,
			height,
		}
		server.to(game.gameId).emit("start", res);
		this.emitNewGameToSpectate(game, players, server);
		game.launchGame();
		return;
	}

	emitNewGameToSpectate(game: Pong, players: Players, server: Server): void {
		const res = {
			id: game.gameId,
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
	
	emitWinner(playerOne: EndGamePlayer, playerTwo: EndGamePlayer, game: Pong, server: Server):
	void {
		if (playerOne.win)
			server.to(game.gameId).emit('gameWinner', playerOne.id);
		else
			server.to(game.gameId).emit('gameWinner', playerTwo.id);
	}

	async updateUserStats(playerOne: EndGamePlayer, playerTwo: EndGamePlayer, server: Server)
	{
		const WinnerId: string = playerOne.win ? playerOne.id : playerTwo.id;
			await this._usersService.addExperience(WinnerId, 20);
			await this._usersService.addRankPoint(WinnerId, true);

			const playerUpdated: Partial<User> = await this._usersService.updateUser({id: WinnerId},
				{wins:{ increment: 1}, played:{increment: 1} } );
			const winnerSocket: Socket = UserIdToSockets.get(WinnerId);
			server.to(winnerSocket.id).emit("updateUser", playerUpdated);
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
	}

	async endGame(
		playerOne: EndGamePlayer,
		playerTwo: EndGamePlayer,
		server: Server,
		gameId: string): Promise<string> 
	{
		try {
			console.log("game ended");
			const game: Pong = this.gameIdToGame.get(gameId);
			if (!game) {
				throw new Error("Game not found");
			}
			this.emitWinner(playerOne, playerTwo, game, server);
			server.to(this.spectateRoom).emit("gameEnded", game.gameId);
			const check: Game = await this._prismaService.game.findUnique(
				{ where: { id: game.gameId } });
			if (check)
				return;
			await this._prismaService.game.create({
				data: {
					id:	game.gameId,
					player_one: { connect: { id: playerOne.id } },
					player_one_score: playerOne.score,
					player_two: { connect: { id: playerTwo.id } },
					player_two_score: playerTwo.score,
				}
			});
			this.gameIdToGame.delete(game.gameId);
			this.playerIdToGame.delete(playerOne.id);
			this.playerIdToGame.delete(playerTwo.id);
			await this.updateUserStats(playerOne, playerTwo, server);
			const playerOneSocket: Socket = UserIdToSockets.get(playerOne.id);
			const playerTwoSocket: Socket = UserIdToSockets.get(playerTwo.id);
			playerOneSocket.leave(game.gameId);
			playerTwoSocket.leave(game.gameId);
			game.resetgame();
			game.start = false;
			game.destructor();

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
			userSocket.join(game.gameId);
		}
	}

	async leaveSpectateGame(gameId: string, userSocket: Socket): Promise<void> {
		const game: Pong = this.gameIdToGame.get(gameId);
		console.log("user left game spectate");
		if (game) {
			userSocket.leave(game.gameId);
		}
	}

	async leave(id: string): Promise<void> {}

	async reconnect(userId: string, userSocket: Socket, server: Server): Promise<void> {
		console.log(await this.isOnGame(userId));
		try{
			if (await this.isOnGame(userId)) {
				const timeout: NodeJS.Timeout = this.userIdToTimeout.get(userId);
				clearTimeout(timeout);
				console.log("user is on game");
				let game: Pong;
				for (const gameSess of this.gameIdToGame.values()) {
					if (gameSess.leftPlayer.id === userId || gameSess.rightPlayer.id === userId) {
						game = this.gameIdToGame.get(gameSess.gameId);	
					}
				}
				if(!game) {
					throw new Error("Game not found");
				}
				this.playerIdToGame.set(userId, game);
				userSocket.join(game.gameId);
				const players: Players = await this.getPlayersByGameId(game.gameId);
				const width: number  = 790;
				const height: number = 390;
				const res: StartInfo = {
					players,
					width,
					height,
				}
				server.to(game.gameId).emit("start", res);
			}
		} catch (err) {
			console.log(err);
		}
	}

	async disconnect(userId: string, userSocket: Socket, server: Server): Promise<void> {
		if (await this.isOnGame(userId)) {
			const game: Pong = this.playerIdToGame.get(userId);
			const players: Players = await this.getPlayersByGameId(game.gameId);
			const leftPlayer: EndGamePlayer = {
				id: players.left.id,
				score: players.left.score,
				win: false,
				loose: true,
			}
			const rightPlayer: EndGamePlayer = {
				id: players.right.id,
				score: players.right.score,
				win: false,
				loose: true,
			}
			if (players.left.id === userId) {
				leftPlayer.loose = true;
				leftPlayer.win = false;
				rightPlayer.loose = false;
				rightPlayer.win = true;
			} else {
				leftPlayer.loose = false;
				leftPlayer.win = true;
				rightPlayer.loose = true;
				rightPlayer.win = false;
			}
			this.playerIdToGame.delete(userId);
			this.userIdToTimeout.set(userId, setTimeout(async () => {
				if (!await this.isOnCurrentGame(userId, game.gameId))
				{
					this.endGame(leftPlayer, rightPlayer, server, game.gameId);
				}
			}, 15000));
		}
	}

	//Utils

	async isOnGame(userId: string): Promise<boolean> {
		for (const game of this.gameIdToGame.values()) {
			if (game.leftPlayer.id === userId || game.rightPlayer.id === userId) {
				return true;
			}
		}
		return false;
	}

	async isOnCurrentGame(userId: string, gameId: string): Promise<boolean> {
		const game: Pong = this.playerIdToGame.get(userId);
		if (game) {
			return game.gameId === gameId;
		}
		return false;
	}

	async getPlayersByGameId(gameId: string)
	{
		const game: Pong = this.gameIdToGame.get(gameId);
		if (game) {
			const players: Players = await this.getPlayers(game.leftPlayer.id, game.rightPlayer.id);
			return players;
		}
		return null;
	}
}