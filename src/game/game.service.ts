import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Game, User, Status } from '@prisma/client';
import { Socket, Server } from 'socket.io';
import { UsersGateway } from 'src/users/users.gateway';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from 'src/users/users.service';
import { UserIdToSockets } from 'src/users/userIdToSockets.service';
// eslint-disable-next-line import/no-cycle
import { Pong } from './entities/neoPong.entities';
import { Players, StartInfo, EndGamePlayer, Player } from './interfaces/game.interface';
import { HEIGHT, WIDTH } from './entities/utils.entities';

@Injectable()
export default class GameService {
	constructor(
		// eslint-disable-next-line no-unused-vars
		private readonly _prismaService: PrismaService,
		// eslint-disable-next-line no-unused-vars
		private readonly _usersService: UsersService,
		// eslint-disable-next-line no-unused-vars
		private readonly _usersGateway: UsersGateway,
	// eslint-disable-next-line no-empty-function
	) {}

	playerIds: string[] = [];

	playerIdToGame: Map<string, Pong> = new Map();

	gameIdToGame: Map<string, Pong> = new Map();

	spectateRoom: string = uuidv4();

	userIdToTimeout: Map<string, NodeJS.Timeout> = new Map();

	// Getter
	async getPlayers(playerOne : string, playerTwo: string): Promise<Partial<Players>> {
		try{
			const playerOneData: Partial<Player> = await this._usersService.getUser(
				{ id: playerOne },
				"id,username,avatar,level,experience,next_level"
			);
			const playerTwoData = await this._usersService.getUser(
				{ id: playerTwo },
				"id,username,avatar,level,experience,next_level"
			);
			if (!playerOneData || !playerTwoData)
				throw new Error('Player not found');
			return {
				left: {
					score: 0,
					...playerOneData,
				},
				right: {
					score: 0,
					...playerTwoData,
				},
			};
		} catch (error) {}
	}

	async getGameHistoryCount(userId: string, search: string ): Promise<number> {
		return await this._prismaService.game.count({
			where: {
				AND: [
					{ OR:
						[
							{ player_one_id: userId, },
							{ player_two_id: userId, },
						],
					},
					{ OR: 
						[
							{ player_one: { username: { contains: search, mode: 'insensitive' }, }, },
							{ player_two: { username: { contains: search, mode: 'insensitive' }, }, },
						],
					},
				],
			},
		});
	}

	async getGameHistory(
		userId: string,
		search: string,
		order: string,
		page?: number,
		take?: number,
	) {
		try {
			const gamesS = await this._prismaService.game.findMany({
				where: {
					AND: [
						{ OR: [ { player_one_id: userId, },
								{ player_two_id: userId,}, ], },
						{ OR: [ { player_one: { username: { contains: search, mode: 'insensitive', }, }, },
								{ player_two: { username: { contains: search, mode: 'insensitive', }, }, }, ], },
					],
				},
				skip: (page - 1) * take || undefined,
				take: take || 20,
				orderBy: { createdAt: order === 'asc' ? 'asc' : 'desc' },
				select: {
					player_one_score: true,
					player_one_level: true,
					player_one_experience: true,
					player_one_next_level: true,
					player_two_score: true,
					player_two_level: true,
					player_two_experience: true,
					player_two_next_level: true,
					player_one: { select: { id: true, username: true, avatar: true, }, },
					player_two: { select: { id: true, username: true, avatar: true, }, },
				},
			});
			if (!gamesS) throw new NotFoundException('Games not found');
			const games = [];
			gamesS.forEach((game) => {
				games.push({
					left: {
						...game.player_one,
						score: game.player_one_score,
						level: game.player_one_level,
						experience: game.player_one_experience,
						next_level: game.player_one_next_level,
					},
					right: {
						...game.player_two,
						score: game.player_two_score,
						level: game.player_two_level,
						experience: game.player_two_experience,
						next_level: game.player_two_next_level,
					},
				});
			});
			const count = await this.getGameHistoryCount(userId, search);
			return { games, count };
		} catch (error) {
			if (error instanceof NotFoundException)
				throw new NotFoundException(error.message);
			throw new InternalServerErrorException(error.message);
		}	
	}

	async getCurrentGame(
		order: string,
		page: number,
		take: number,
		search?: string,
	): Promise<any> {
		try {
			const games = [];
			for (const game of this.gameIdToGame.entries()) {
				const player: Players = await this.getPlayers(game[1].leftPlayer.id, game[1].rightPlayer.id);
				const left: string = player.left.username.toLowerCase();
				const right: string = player.right.username.toLowerCase();
				if (!search || search && left.includes(search.toLowerCase())
					|| right.includes(search.toLowerCase()))
						games.push(game);
			}
			if (take > games.length) take = games.length;
			if (order === 'desc') page = (games.length / take) - page;
			else page++;
			let res = await this.initCurrentGameArray(page, take, games);
			if (order === 'asc') res = res.reverse();
			return { res, count: games.length };
		} catch (error) {
			throw new InternalServerErrorException(error.message);
		}
	}

	getPlayerGame(userId: string): string {
		try {
			for (const game of this.gameIdToGame.values()) {
				if (game.leftPlayer.id === userId || game.rightPlayer.id === userId) {
					return game.gameId;
				}
			}
			throw new NotFoundException('Game not found');
		} catch (error) {
			if (error instanceof NotFoundException)
				throw new NotFoundException(error.message);
			throw new InternalServerErrorException(error.message);
		}
	}

	async initCurrentGameArray(page: number, take: number, games):
	Promise<any> {
		try {
			const res = [];
			for (let i = (page - 1) * take; i < page * take; i++) {
				i = Math.floor(i);
				if (i < 0) i = 0;
				if (i >= games.length) break;
				let player:
				Players = await this.getPlayers(games[i][1].leftPlayer.id, games[i][1].rightPlayer.id);
				player = {
					left: {
						...player.left,
						score: games[i][1].leftPlayer.score,
					},
					right: {
						...player.right,
						score: games[i][1].rightPlayer.score,
					},
				};
				res.unshift({
					id: games[i][1].gameId,
					players: player,
				});
			}
			return res;
		} catch (error) {
			throw new Error(error);
		}
	}

	// Actions
	async connect(id: string, server: Server): Promise<void> {
		try {
			this.playerIds.push(id);
			if (this.playerIds.length === 2) {
				const playerOne = this.playerIds[0];
				const playerTwo = this.playerIds[1];
				this.playerIds = [];
				await this.create(playerOne, playerTwo, server, true);
			}
		} catch (error) {
			throw new Error(error.message);
		}
	}

	async updatePlayersInGameStatus(players: Players): Promise<void> {
		try {
			await this._usersService.updateUser({ id: players.left.id }, { status: Status.INGAME });
			await this._usersService.updateUser({ id: players.right.id }, { status: Status.INGAME });
	
			this._usersGateway._emitToFriends(players.left.id, 'user_in_game', {
				id: players.left.id,
				status: Status.INGAME,
				username: players.left.username,
				avatar: players.left.avatar,
			});
			this._usersGateway._emitToFriends(players.right.id, 'user_in_game', {
				id: players.right.id,
				status: Status.INGAME,
				username: players.right.username,
				avatar: players.right.avatar,
			});
		} catch (error) {
			throw new Error(error);
		}
	}

	joinPlayersSocketToGameRoom(id: string, opponent: string, gameId: string): void {
		const playerOneSockets: Socket[] = UserIdToSockets.get(id);
		const playerTwoSockets: Socket[] = UserIdToSockets.get(opponent);
		playerOneSockets.forEach((socket) => socket.join(gameId));
		playerTwoSockets.forEach((socket) => socket.join(gameId));
	}

	createFakeGame(id: string, opponent: string, server: Server): void {
		for (let i = 0; i < 100; i++) {
			const gameId: string = uuidv4();
			const game: Pong = new Pong(gameId, id, opponent, server, this, false);
			this.gameIdToGame.set(gameId, game);
		}
	}

	async create(id: string, opponent: string, server: Server, bonus: boolean): Promise<boolean> {
		if (this.playerIdToGame.has(id) || this.playerIdToGame.has(opponent)) return false;
		const gameId: string = uuidv4();
		const game: Pong = new Pong(gameId, id, opponent, server, this, bonus);
		//this.createFakeGame(id, opponent, server);
		this.playerIdToGame.set(id, game);
		this.playerIdToGame.set(opponent, game);
		this.joinPlayersSocketToGameRoom(id, opponent, gameId);
		const players: Players = await this.getPlayers(id, opponent);
		const preGameTime = 5000;
		await this.updatePlayersInGameStatus(players);
		const startTime: number = Date.now() + preGameTime;
		game.startTime = startTime;
		const res: StartInfo = {
			players,
			width: WIDTH,
			height: HEIGHT,
			startTime,
		};
		server.to(game.gameId).emit('start', res);
		this.gameIdToGame.set(gameId, game);
		setTimeout(() => {
			game.runGame();
			this.emitNewGameToSpectate(game, players, server);
		}, preGameTime);
		return true;
	}

	emitNewGameToSpectate(game: Pong, players: Players, server: Server): void {
		const res = {
			id: game.gameId,
			players,
		};
		server.to(this.spectateRoom).emit('newGameStarted', res);
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

	// eslint-disable-next-line class-methods-use-this
	emitWinner(playerOne: EndGamePlayer, playerTwo: EndGamePlayer, game: Pong, server: Server):
	void {
		if (playerOne.win) server.to(game.gameId).emit('gameWinner', playerOne.id);
		else server.to(game.gameId).emit('gameWinner', playerTwo.id);
	}

	async updateUserStats(playerOne: EndGamePlayer, playerTwo: EndGamePlayer, server: Server) {
		const WinnerId: string = playerOne.win ? playerOne.id : playerTwo.id;
		await this._usersService.addExperience(WinnerId, 20);
		await this._usersService.addRankPoint(WinnerId, true);
		const playerUpdated: Partial<User> = await this._usersService.updateUser(
			{ id: WinnerId },
			{ wins: { increment: 1 }, played: { increment: 1 } },
		);
		UserIdToSockets.emit(WinnerId, server, 'updateUser', playerUpdated);
		if (playerOne.win) {
			const updatedPlayerTwo: Partial<User> = await this._usersService.updateUser(
				{ id: playerTwo.id },
				{ loses: { increment: 1 }, played: { increment: 1 } },
			);
			UserIdToSockets.emit(playerTwo.id, server, 'updateUser', updatedPlayerTwo);
		} else {
			const updatedPlayerOne: Partial<User> = await this._usersService.updateUser(
				{ id: playerOne.id },
				{ loses: { increment: 1 }, played: { increment: 1 } },
			);
			UserIdToSockets.emit(playerOne.id, server, 'updateUser', updatedPlayerOne);
		}
	}

	async addGameHistory(playerOne: EndGamePlayer, playerTwo: EndGamePlayer, game: Pong) {
		const check: Game = await this._prismaService.game.findUnique(
			{ where: { id: game.gameId } },
		);
		if (check) return false;
		const player_one: User = await this._prismaService.user.findUnique(
			{ where: { id: playerOne.id } },
		);
		const player_two: User = await this._prismaService.user.findUnique(
			{ where: { id: playerTwo.id } },
		);
		if (!player_one || !player_two) throw new Error('User not found');
		await this._prismaService.game.create({
			data: {
				id:	game.gameId,
				player_one: { connect: { id: playerOne.id } },
				player_one_score: playerOne.score,
				player_one_level: player_one.level,
				player_one_experience: player_one.experience,
				player_one_next_level: player_one.next_level,

				player_two: { connect: { id: playerTwo.id } },
				player_two_score: playerTwo.score,
				player_two_level: player_two.level,
				player_two_experience: player_two.experience,
				player_two_next_level: player_two.next_level,
			},
		});
		return true;
	}

	leaveGameRoom(playerOneId: string, playerTwoId: string, gameId: string ): void {
		const playerOneSockets: Socket[] = UserIdToSockets.get(playerOneId);
		const playerTwoSockets: Socket[] = UserIdToSockets.get(playerTwoId);
		if (playerOneSockets && playerOneSockets.length > 0) {
			playerOneSockets.forEach((socket) => socket.leave(gameId));
		}
		if (playerTwoSockets && playerTwoSockets.length > 0) {
			playerTwoSockets.forEach((socket) => socket.leave(gameId));
		}
	}

	async updatePlayersLeftGameStatus(playerOne: EndGamePlayer, playerTwo: EndGamePlayer) {
		await this._usersService.updateUser({ id: playerOne.id }, { status: Status.ONLINE });
		await this._usersService.updateUser({ id: playerTwo.id }, { status: Status.ONLINE });
		this._usersGateway._emitToFriends(
			playerOne.id,
			'user_left_game',
			{ id: playerOne.id, status: Status.INGAME },
		);
		this._usersGateway._emitToFriends(
			playerTwo.id,
			'user_left_game',
			{ id: playerTwo.id, status: Status.INGAME },
		);
	}

	async endGame(
		playerOne: EndGamePlayer,
		playerTwo: EndGamePlayer,
		server: Server,
		gameId: string,
	): Promise<string> {
		try {
			const game: Pong = this.gameIdToGame.get(gameId);
			if (!game) {
				throw new Error('Game not found');
			}
			this.emitWinner(playerOne, playerTwo, game, server);
			server.to(this.spectateRoom).emit('gameEnded', game.gameId);
			if (await this.addGameHistory(playerOne, playerTwo, game) === false) return;
			this.gameIdToGame.delete(game.gameId);
			this.playerIdToGame.delete(playerOne.id);
			this.playerIdToGame.delete(playerTwo.id);
			await this.updateUserStats(playerOne, playerTwo, server);
			await this.updatePlayersLeftGameStatus(playerOne, playerTwo);
			this.leaveGameRoom(playerOne.id, playerTwo.id, game.gameId);
			game.resetgame();
			game.start = false;
			game.destructor();
		} catch (err) {
			throw new Error(err);
		}
	}

	async onSpectate(id: string, userSocket: Socket): Promise<void> {
		userSocket.join(this.spectateRoom);
	}

	async offSpectate(id: string, userSocket: Socket): Promise<void> {
		userSocket.leave(this.spectateRoom);
	}

	async spectateGame(gameId: string, userSocket: Socket, server: Server): Promise<void> {
		const game: Pong = this.gameIdToGame.get(gameId);
		if (game) {
			const players: Players = await this.getPlayersByGameId(game.gameId);
			players.left.score = game.leftPlayer.score;
			players.right.score = game.rightPlayer.score;
			const res: StartInfo = {
				players,
				width: WIDTH,
				height: HEIGHT,
				startTime: game.startTime > Date.now() ? game.startTime : null,
			};
			server.to(userSocket.id).emit('start', res);
			userSocket.join(game.gameId);
		}
	}

	async leaveSpectateGame(gameId: string, userSocket: Socket): Promise<void> {
		const game: Pong = this.gameIdToGame.get(gameId);
		if (game) {
			userSocket.leave(game.gameId);
		}
	}

	async reconnect(userId: string, userSocket: Socket, server: Server): Promise<void> {
		try {
			if (await this.isOnGame(userId)) {
				const timeout: NodeJS.Timeout = this.userIdToTimeout.get(userId);
				clearTimeout(timeout);
				let game: Pong;
				for (const gameSess of this.gameIdToGame.values()) {
					if (gameSess.leftPlayer.id === userId || gameSess.rightPlayer.id === userId) {
						game = this.gameIdToGame.get(gameSess.gameId);	
					}
				}
				if (!game) {
					throw new Error('Game not found');
				}
				this.playerIdToGame.set(userId, game);
				userSocket.join(game.gameId);
				const players: Players = await this.getPlayersByGameId(game.gameId);
				players.left.score = game.leftPlayer.score;
				players.right.score = game.rightPlayer.score;
				const res: StartInfo = {
					players,
					width: WIDTH,
					height: HEIGHT,
					startTime: game.startTime > Date.now() ? game.startTime : null,
				};
				server.to(game.gameId).emit('start', res);
			}
		} catch (err) {}
	}

	async disconnect(userId: string, server: Server): Promise<void> {
		if (await this.isOnGame(userId)) {
			const game: Pong = this.playerIdToGame.get(userId);
			if (game) {
				const players: Players = await this.getPlayersByGameId(game.gameId);
				const leftPlayer: EndGamePlayer = {
					id: players.left.id,
					score: players.left.score,
					win: false,
					loose: true,
				};
				const rightPlayer: EndGamePlayer = {
					id: players.right.id,
					score: players.right.score,
					win: false,
					loose: true,
				};
				leftPlayer.win = players.right.id === userId ? true : false;
				leftPlayer.loose = players.right.id === userId ? false : true;
				rightPlayer.win = players.left.id === userId ? true : false;
				rightPlayer.loose = players.left.id === userId ? false : true;
				this.playerIdToGame.delete(userId);
				this.userIdToTimeout.set(userId, setTimeout(async () => {
					if (!await this.isOnCurrentGame(userId, game.gameId) && this.gameIdToGame.has(game.gameId)) {
						leftPlayer.score = game.leftPlayer.score;
						rightPlayer.score = game.rightPlayer.score;
						this.endGame(leftPlayer, rightPlayer, server, game.gameId);
					}
				}, 15000));
			}
		}
	}

	// Utils

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

	async getPlayersByGameId(gameId: string) {
		const game: Pong = this.gameIdToGame.get(gameId);
		if (game) {
			const players: Players = await this.getPlayers(game.leftPlayer.id, game.rightPlayer.id);
			return players;
		}
		return null;
	}
}
