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

@WebSocketGateway()
@UseGuards(JwtAuthGuard)
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect{
	constructor(
		private readonly _matchmakingService: MatchmakingService,
		private readonly _gameService: GameService
		) {}

	@WebSocketServer()
	private readonly _server: Server;
	
	async handleConnection(socket: Socket) {
	}

	async handleDisconnect(socket: Socket) {
	}
	
	/* Matchmaking */

	@SubscribeMessage("join_queue")
	handleJoinMatchmaking(
		@GetCurrentUserId() currentID: string,
		@ConnectedSocket() socket: Socket
	): void {
		this._matchmakingService.join(currentID, this._server);
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
		this._server.to(socket.id).emit("accepted_game_request");
	}

	@SubscribeMessage("decline_game_request")
	handleDeclineGame(
		@GetCurrentUserId() currentID: string,
		@MessageBody('matchmaking') matchmaking: boolean = true,
		@ConnectedSocket() socket: Socket
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
		this._server.to(socket.id).emit("game_connected");
	}

	@SubscribeMessage("onSpectate")
	handleOnSpectate(
		@GetCurrentUserId() currentID: string,
		@ConnectedSocket() socket: Socket
	): void {
		this._gameService.onSpectate(currentID, socket);
		this._server.to(socket.id).emit("spectate_connected");
	}

	@SubscribeMessage("offSpectate")
	handleOffSpectate(
		@GetCurrentUserId() currentID: string,
		@ConnectedSocket() socket: Socket
	): void {
		this._gameService.offSpectate(currentID, socket);
		this._server.to(socket.id).emit("spectate_disconnected");
	}
	


	@SubscribeMessage("spectateGame")
	handleSpectate(
		@ConnectedSocket() socket: Socket,
		@MessageBody("gameId") gameId: string
	): void {
		this._gameService.spectateGame(gameId, socket, this._server);
		this._server.to(socket.id).emit("spectate_connected");
	}

	@SubscribeMessage("leaveSpectateGame")
	handleLeaveSpectate(
		@ConnectedSocket() socket: Socket,
		@MessageBody("gameId") gameId: string
	): void {
		this._gameService.leaveSpectateGame(gameId, socket);
		this._server.to(socket.id).emit("spectate_disconnected");
	}

	@SubscribeMessage("joined_game")
	hanflerJoinedGame(
		@GetCurrentUserId() currentID: string,
		@ConnectedSocket() socket: Socket,
		@MessageBody("gameId") gameId: string
	): void {
		
	}

	@SubscribeMessage("disconnect_game")
	handleDisconnectGame(
		@GetCurrentUserId() currentID: string,
		@ConnectedSocket() socket: Socket,
	): void {
		console.log("disconnected from game");
		this._gameService.disconnect(currentID, socket, this._server);
		this._server.to(socket.id).emit("game_disconnected");
	}

	@SubscribeMessage("connect_game")
	async handleReconnect(
		@GetCurrentUserId() currentID: string,
		@ConnectedSocket() socket: Socket,
	) {
		console.log("connected to game");
		const isOnGame = await this._gameService.isOnGame(currentID);
		console.log(isOnGame);
		if(isOnGame)
			this._gameService.reconnect(currentID, socket, this._server);
		this._server.to(socket.id).emit("reconnected_to_game", isOnGame);
	}
}