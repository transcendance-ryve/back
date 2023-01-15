import { Query, UseGuards } from "@nestjs/common";
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { GetCurrentUserId } from "src/decorators/user.decorator";
import { JwtAuthGuard } from "src/users/guard/jwt.guard";
import { MatchmakingService } from "./matchmaking.service";
import { Server, Socket } from "socket.io";
import { GameService } from "./game.service";

@WebSocketGateway()
@UseGuards(JwtAuthGuard)
export class GameGateway {
	constructor(
		private readonly _matchmakingService: MatchmakingService,
		private readonly _gameService: GameService
		) {}

	@WebSocketServer()
	private readonly _server: Server;
	/* Matchmaking */

	@SubscribeMessage("join_queue")
	handleJoinMatchmaking(
		@GetCurrentUserId() currentID: string,
		@ConnectedSocket() socket: Socket
	): void {
		this._matchmakingService.join(currentID);
		this._server.to(socket.id).emit("joined_queue");
	}

	@SubscribeMessage("left_queue")
	handleLeaveMatchmaking(
		@GetCurrentUserId() currentID: string,
		@ConnectedSocket() socket: Socket
	): void {
		this._matchmakingService.leave(currentID);
		this._server.to(socket.id).emit("left_queue");
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
		this._matchmakingService.declineGameRequest(currentID, matchmaking);
		this._server.to(socket.id).emit("declined_game_request");
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
	
	@SubscribeMessage("reconnect")
	handleReconnect(
		@GetCurrentUserId() currentID: string,
		@ConnectedSocket() socket: Socket
	): void {}

	@SubscribeMessage("spectate")
	handleSpectate(
		@GetCurrentUserId() currentID: string,
		@ConnectedSocket() socket: Socket
	): void {}
}