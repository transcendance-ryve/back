import { Query, UseGuards } from "@nestjs/common";
import {
	ConnectedSocket,
	MessageBody,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
	OnGatewayConnection,
	OnGatewayDisconnect 
} from "@nestjs/websockets";
import { GetCurrentUserId } from "src/decorators/user.decorator";
import { JwtAuthGuard } from "src/users/guard/jwt.guard";
import { MatchmakingService } from "./matchmaking.service";
import { Server, Socket } from "socket.io";
import { GameService } from "./game.service";
import { UserIdToSockets } from "src/users/userIdToSockets.service";

@WebSocketGateway()
@UseGuards(JwtAuthGuard)
export class GameGateway{
	constructor(
		private readonly _matchmakingService: MatchmakingService,
		private readonly _gameService: GameService
		) {}

	@WebSocketServer()
	private readonly _server: Server;

	async handleDisconnect(socket: Socket) {
		const userID = socket.data.id;

		console.log('userID', userID);
	
		this._matchmakingService.leave(userID, this._server);
	}
	
	/* Matchmaking */

	@SubscribeMessage("join_queue")
	handleJoinMatchmaking(
		@GetCurrentUserId() currentID: string,
		@ConnectedSocket() socket: Socket,
		@MessageBody("bonus") bonus: boolean,
	): void {
		this._matchmakingService.join(currentID, this._server, bonus);
	}

	@SubscribeMessage("leave_queue")
	handleLeaveMatchmaking(
		@GetCurrentUserId() currentID: string,
		@ConnectedSocket() socket: Socket
	): void {
		this._matchmakingService.leave(currentID, this._server);
	
	}

	@SubscribeMessage("accept_game_request")
	handleAcceptGame(
		@GetCurrentUserId() currentID: string,
		@ConnectedSocket() socket: Socket
	): void {
		this._matchmakingService.acceptGameRequest(currentID, this._server);
		UserIdToSockets.emit(currentID, this._server, "accepted_game_request");
	}

	@SubscribeMessage("decline_game_request")
	handleDeclineGame(
		@GetCurrentUserId() currentID: string,
		@MessageBody('matchmaking') matchmaking = true,
	): void {
		this._matchmakingService.declineGameRequest(currentID, matchmaking, this._server);
	}

	/* Game events */

	@SubscribeMessage("keypress")
	handleKeyPress(
		@GetCurrentUserId() currentID: string,
		@MessageBody() key: string,
	): void {
		if (key === "up")
			key = 'W';
		else if (key === "down")
			key = 'S';
		this._gameService.keyPress(currentID, key);
	}

	@SubscribeMessage("keyrelease")
	handleKeyRelease(
		@GetCurrentUserId() currentID: string,
		@MessageBody() key: string,
		@ConnectedSocket() socket: Socket
	): void {
		if (key === "up")
			key = 'W';
		else if (key === "down")
			key = 'S';
		this._gameService.keyRelease(currentID, key);
	}

	@SubscribeMessage("game_connect")
	handleConnect(
		@GetCurrentUserId() currentID: string,
		@ConnectedSocket() socket: Socket
	): void {
		this._gameService.connect(currentID, this._server);
		UserIdToSockets.emit(currentID, this._server, "game_connected");
	}

	@SubscribeMessage("onSpectate")
	handleOnSpectate(
		@GetCurrentUserId() currentID: string,
		@ConnectedSocket() socket: Socket
	): void {
		this._gameService.onSpectate(currentID, socket);
		UserIdToSockets.emit(currentID, this._server, "spectate_connected");
	}

	@SubscribeMessage("offSpectate")
	handleOffSpectate(
		@GetCurrentUserId() currentID: string,
		@ConnectedSocket() socket: Socket
	): void {
		this._gameService.offSpectate(currentID, socket);
		UserIdToSockets.emit(currentID, this._server, "spectate_disconnected");
	}

	@SubscribeMessage("spectateGame")
	handleSpectate(
		@GetCurrentUserId() currentID: string,
		@ConnectedSocket() socket: Socket,
		@MessageBody("gameId") gameId: string
	): void {
		this._gameService.spectateGame(gameId, socket, this._server);
		UserIdToSockets.emit(currentID, this._server, "spectate_connected");
	}

	@SubscribeMessage("leaveSpectateGame")
	handleLeaveSpectate(
		@GetCurrentUserId() currentID: string,
		@ConnectedSocket() socket: Socket,
		@MessageBody("gameId") gameId: string
	): void {
		this._gameService.leaveSpectateGame(gameId, socket);
		UserIdToSockets.emit(currentID, this._server, "spectate_disconnected");
	}

	@SubscribeMessage("disconnect_game")
	handleDisconnectGame(
		@GetCurrentUserId() currentID: string,
		@ConnectedSocket() socket: Socket,
	): void {
		console.log("disconnected from game");
		this._gameService.disconnect(currentID, this._server);
		UserIdToSockets.emit(currentID, this._server, "game_disconnected");
	}

	@SubscribeMessage("connect_game")
	async handleReconnect(
		@GetCurrentUserId() currentID: string,
		@ConnectedSocket() socket: Socket,
	) {
		console.log("connected to game");
		const isOnGame = await this._gameService.isOnGame(currentID);
		if(isOnGame)
			this._gameService.reconnect(currentID, socket, this._server);
		UserIdToSockets.emit(currentID, this._server, "reconnected_to_game", isOnGame);
	}
}