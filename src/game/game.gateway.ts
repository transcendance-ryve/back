import { SubscribeMessage, WebSocketGateway } from "@nestjs/websockets";

@WebSocketGateway({
	namespace: "game",
})
export class GameGateway {
	constructor() {}

	@SubscribeMessage("create_game")
	handleCreateGame(client: any) {
	}

	@SubscribeMessage("join_game")
	handleJoinGame(client: any) {
	}

	@SubscribeMessage("leave_game")
	handleLeaveGame(client: any) {
	}

	@SubscribeMessage("watch_game")
	handleWatchGame(client: any) {
	}

	@SubscribeMessage("unwatch_game")
	handleUnwatchGame(client: any) {
	}
}