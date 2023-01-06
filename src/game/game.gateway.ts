import { SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Socket } from 'socket.io';
import { JwtPayloadDto } from "src/auth/dto/jwt-payload.dto";
import { GameService } from "./game.service";



@WebSocketGateway()
export class GameGateway {
	constructor(
		private readonly _gameService: GameService,
	) {}

	@WebSocketServer()
	private _server: Socket;

	@SubscribeMessage("join_matchmaking")
	async handleJoinMatchmaking(socket: Socket, payload: JwtPayloadDto): Promise<string> {
		const { id } = payload;

		// this._gameService.joinMatchmaking(socket);

		this._gameService.findOpponent();


		return "joined matchmaking";
	}

	@SubscribeMessage("leave_matchmaking")
	handleLeaveMatchmaking(payload: any): string {
		
		return "left matchmaking";
	}


	@SubscribeMessage("accept_game")
	handleAcceptGame(client: any, payload: any): void {
		
	}

	@SubscribeMessage("decline_game")
	handleDeclineGame(socket: Socket, payload: any): void {
		const { id } = payload;

		// this._gameService.declineGame(id);
	}
}