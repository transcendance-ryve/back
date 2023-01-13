import { UseGuards } from "@nestjs/common";
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { GetCurrentUserId } from "src/decorators/user.decorator";
import { JwtAuthGuard } from "src/users/guard/jwt.guard";
import { MatchmakingService } from "./matchmaking.service";
import { Server, Socket } from "socket.io";
import { GameSessions } from "./entities/gamesSessions.entity";

@WebSocketGateway()
@UseGuards(JwtAuthGuard)
export class GameGateway {
	constructor(
		private readonly _matchmakingService: MatchmakingService,
		private readonly _gameSessions: GameSessions
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
		@MessageBody('key') key: string,
	): void {
		console.log("key pressed: " + key)
		this._gameSessions.keyPress(currentID, key);
	}

	@SubscribeMessage("keyrelease")
	handleKeyRelease(
		@GetCurrentUserId() currentID: string,
		@MessageBody('key') key: string,
		@ConnectedSocket() socket: Socket
	): void {

	}

	@SubscribeMessage("connect")
	handleConnect(
		@GetCurrentUserId() currentID: string,
		@ConnectedSocket() socket: Socket
	): void {}

	@SubscribeMessage("disconnect")
	handleDisconnect(
		@GetCurrentUserId() currentID: string,
		@ConnectedSocket() socket: Socket
	): void {}

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

	//score
}