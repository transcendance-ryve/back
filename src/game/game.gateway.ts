import { UseGuards } from "@nestjs/common";
import { SubscribeMessage, WebSocketGateway } from "@nestjs/websockets";
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

		console.log(usersInQueue);
		return usersInQueue;
	}

	@SubscribeMessage("join_matchmaking")
	handleJoinMatchmaking(
		@GetCurrentUserId() currentID: string,
	): void {
		this._matchmakingService.join(currentID);
	}

	@SubscribeMessage("leave_matchmaking")
	handleLeaveMatchmaking(
		@GetCurrentUserId() currentID: string,
	): void {
		this._matchmakingService.leave(currentID);
	}

	@SubscribeMessage("accept_game")
	handleAcceptGame(
		@GetCurrentUserId() currentID: string
	): void {
		this._matchmakingService.acceptGameRequest(currentID);
	}

	@SubscribeMessage("decline_game")
	handleDeclineGame(
		@GetCurrentUserId() currentID: string
	): void {
		this._matchmakingService.declineGameRequest(currentID, true);
	}
}