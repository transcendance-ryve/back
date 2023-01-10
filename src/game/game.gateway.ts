import { UseGuards } from "@nestjs/common";
import { MessageBody, SubscribeMessage, WebSocketGateway } from "@nestjs/websockets";
import { GetCurrentUserId } from "src/decorators/user.decorator";
import { JwtAuthGuard } from "src/users/guard/jwt.guard";
import { MatchmakingService } from "./matchmaking.service";

@WebSocketGateway()
@UseGuards(JwtAuthGuard)
export class GameGateway {
	constructor(
		private readonly _matchmakingService: MatchmakingService,
	) {}

	@SubscribeMessage("get_users_in_queue")
	handleGetUsersInQueue(): number {
		const usersInQueue = this._matchmakingService.count();

		return usersInQueue;
	}

	@SubscribeMessage("join_queue")
	handleJoinMatchmaking(
		@GetCurrentUserId() currentID: string,
	): void {
		this._matchmakingService.join(currentID);
	}

	@SubscribeMessage("left_queue")
	handleLeaveMatchmaking(
		@GetCurrentUserId() currentID: string,
	): void {
		this._matchmakingService.leave(currentID);
	}

	@SubscribeMessage("accept_game_request")
	handleAcceptGame(
		@GetCurrentUserId() currentID: string
	): void {
		this._matchmakingService.acceptGameRequest(currentID);
	}

	@SubscribeMessage("decline_game_request")
	handleDeclineGame(
		@GetCurrentUserId() currentID: string,
		@MessageBody('matchmaking') matchmaking: boolean = true
	): void {
		this._matchmakingService.declineGameRequest(currentID, matchmaking);
	}
}