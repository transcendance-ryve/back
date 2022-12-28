import { UseGuards } from "@nestjs/common";
import { ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Status, User } from "@prisma/client";
import { Server, Socket } from 'socket.io';
import { GetUser } from "src/decorators/user.decorator";
import { JwtAuthGuard } from "./guard/jwt.guard";
import { UsersService } from "./users.service";

@WebSocketGateway({
	namespace: 'users',
	cors: {
		origin: 'http://localhost:5173',
	},
	credentials: true,
})
@UseGuards(JwtAuthGuard)
export class UsersGateway {
	@WebSocketServer() server: Server;

	constructor(private readonly _userService: UsersService) {}
	
	@SubscribeMessage('user_connected')
	connect(
		@GetUser() user: User,
		@ConnectedSocket() client: Socket,
	) {
		this.server.emit('user_connected', `${client.id} is connected`);
		this._userService.updateUser({ id: user.id }, { status: Status.ONLINE });
	}

	@SubscribeMessage('user_disconnected')
	disconnect(
		@GetUser() user: User,
		@ConnectedSocket() client: Socket,
	) {
		this.server.emit('user_disconnected', `${client.id} is disconnected`);
		this._userService.updateUser({ id: user.id }, { status: Status.OFFLINE });
	}

	@SubscribeMessage('join_game')
	joinGame(
		@GetUser() user: User,
		@ConnectedSocket() client: Socket
	) : void {
		this._userService.updateUser({ id: user.id }, { status: Status.INGAME });
		this.server.emit('userJoinedGame', `${client.id} joined game`);
	}

	@SubscribeMessage('leave_game')
	leaveGame(
		@GetUser() user: User,
		@ConnectedSocket() client: Socket
	) : void {
		this._userService.updateUser({ id: user.id }, { status: Status.ONLINE });
		this.server.emit('userLeftGame', `${client.id} left game`);
	}
}