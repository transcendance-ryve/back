import { UseGuards } from '@nestjs/common';
import {
	ConnectedSocket,
	MessageBody,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from '@nestjs/websockets';
import { GetCurrentUserId } from 'src/decorators/user.decorator';
import { JwtAuthGuard } from 'src/users/guard/jwt.guard';
import { Server, Socket } from 'socket.io';
import { UserIdToSockets } from 'src/users/userIdToSockets.service';
import { MatchmakingService } from './matchmaking.service';
import GameService from './game.service';

@WebSocketGateway({
	cors: {
		origin: process.env.FRONTEND_URL,
		credentials: true,
	},
})
@UseGuards(JwtAuthGuard)
export default class GameGateway {
	constructor(
		// eslint-disable-next-line no-unused-vars
		private readonly _matchmakingService: MatchmakingService,
		// eslint-disable-next-line no-unused-vars
		private readonly _gameService: GameService,
	// eslint-disable-next-line no-empty-function
	) {}

	@WebSocketServer()
	private readonly _server: Server;

	async handleDisconnect(socket: Socket) {
		const userID = socket.data.id;

		this._matchmakingService.leave(userID, this._server);
		this._gameService.disconnect(userID, this._server);
	}

	/* Matchmaking */

	@SubscribeMessage('join_queue')
	handleJoinMatchmaking(
		@GetCurrentUserId() currentID: string,
		@MessageBody('bonus') bonus: boolean,
	): void {
		this._matchmakingService.join(currentID, this._server, bonus);
	}

	@SubscribeMessage('leave_queue')
	handleLeaveMatchmaking(
		@GetCurrentUserId() currentID: string,
	): void {
		this._matchmakingService.leave(currentID, this._server);
	}

	@SubscribeMessage('send_game_request')
	async handleSendGameRequest(
		@GetCurrentUserId() currentID: string,
		@ConnectedSocket() socket: Socket,
		@MessageBody('opponent') opponentID: string,
		@MessageBody('bonus') bonus: boolean,

	): Promise<void> {
		this._matchmakingService.createGameRequest(
			currentID,
			opponentID,
			false,
			this._server,
			bonus,
		);
	}

	@SubscribeMessage("join_play")
	handleOnPlay(
		@GetCurrentUserId() currentID: string,
	): void {
		const sockets = UserIdToSockets.get(currentID);
		sockets.forEach(socket => socket.join("matchmaking"));

		this._server.to("matchmaking").emit("matchmaking_queue_count", this._matchmakingService.count());
	}

	@SubscribeMessage("leave_play")
	handleOnLeavePlay(
		@GetCurrentUserId() currentID: string,
	): void {
		const sockets = UserIdToSockets.get(currentID);
		sockets.forEach(socket => socket.leave("matchmaking"));
	}

	@SubscribeMessage("accept_game_request")
	handleAcceptGame(
		@GetCurrentUserId() currentID: string,
		@ConnectedSocket() socket: Socket,
		@MessageBody('matchmaking') matchmaking: boolean,
	): void {
		this._matchmakingService.acceptGameRequest(currentID, this._server, matchmaking);
	}

	@SubscribeMessage('decline_game_request')
	handleDeclineGame(
		@GetCurrentUserId() currentID: string,
		@MessageBody('matchmaking') matchmaking: boolean,
	): void {
		this._matchmakingService.declineGameRequest(currentID, matchmaking, this._server);
	}

	/* Game events */

	@SubscribeMessage('keypress')
	handleKeyPress(
		@GetCurrentUserId() currentID: string,
		@MessageBody() key: string,
	): void {
		if (key === 'up') key = 'W';
		else if (key === 'down') key = 'S';
		this._gameService.keyPress(currentID, key);
	}

	@SubscribeMessage('keyrelease')
	handleKeyRelease(
		@GetCurrentUserId() currentID: string,
		@MessageBody() key: string,
	): void {
		if (key === 'up') key = 'W';
		else if (key === 'down') key = 'S';
		this._gameService.keyRelease(currentID, key);
	}

	@SubscribeMessage('game_connect')
	handleConnect(
		@GetCurrentUserId() currentID: string,
	): void {
		try {
			this._gameService.connect(currentID, this._server);
			UserIdToSockets.emit(currentID, this._server, 'game_connected');
		} catch (e) {
			UserIdToSockets.emit(currentID, this._server, 'game_connect_failed');
		}
	}

	@SubscribeMessage('onSpectate')
	handleOnSpectate(
		@GetCurrentUserId() currentID: string,
		@ConnectedSocket() socket: Socket,
	): void {
		this._gameService.onSpectate(currentID, socket);
		UserIdToSockets.emit(currentID, this._server, 'spectate_connected');
	}

	@SubscribeMessage('offSpectate')
	handleOffSpectate(
		@GetCurrentUserId() currentID: string,
		@ConnectedSocket() socket: Socket,
	): void {
		this._gameService.offSpectate(currentID, socket);
		UserIdToSockets.emit(currentID, this._server, 'spectate_disconnected');
	}

	@SubscribeMessage('spectateGame')
	handleSpectate(
		@GetCurrentUserId() currentID: string,
		@ConnectedSocket() socket: Socket,
		@MessageBody('gameId') gameId: string,
	): void {
		this._gameService.spectateGame(gameId, socket, this._server);
		UserIdToSockets.emit(currentID, this._server, 'spectate_connected');
	}

	@SubscribeMessage('leaveSpectateGame')
	handleLeaveSpectate(
		@GetCurrentUserId() currentID: string,
		@ConnectedSocket() socket: Socket,
		@MessageBody('gameId') gameId: string,
	): void {
		this._gameService.leaveSpectateGame(gameId, socket);
		UserIdToSockets.emit(currentID, this._server, 'spectate_disconnected');
	}

	@SubscribeMessage('disconnect_game')
	handleDisconnectGame(
		@GetCurrentUserId() currentID: string,
	): void {
		this._gameService.disconnect(currentID, this._server);
		UserIdToSockets.emit(currentID, this._server, 'game_disconnected');
	}

	@SubscribeMessage('connect_game')
	async handleReconnect(
		@GetCurrentUserId() currentID: string,
		@ConnectedSocket() socket: Socket,
	) {
		const isOnGame = await this._gameService.isOnGame(currentID);
		if (isOnGame) this._gameService.reconnect(currentID, socket, this._server);
		UserIdToSockets.emit(currentID, this._server, 'reconnected_to_game', isOnGame);
	}
}
