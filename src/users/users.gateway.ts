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
		origin: '*',
	},
	credentials: true,
})
@UseGuards(JwtAuthGuard)
export class UsersGateway {
	@WebSocketServer() server: Server;

	constructor(private readonly _userService: UsersService) {}
	
	@SubscribeMessage('userConnected')
	connect(
		@ConnectedSocket() client: Socket,
	) {
		console.log(client.id);
		// this.server.emit('userConnected', `${client.id} is connected`);
		// this._userService.updateUser({ id: user.id }, { status: Status.ONLINE });
	}

// 	handleDisconnect(
// 		@GetUser() user: User,
// 	) {
// 		this._userService.updateUser({ id: user.id }, { status: Status.OFFLINE });
// 	}

// 	@SubscribeMessage('join_game')
// 	joinGame(
// 		@GetUser() user: User,
// 		@ConnectedSocket() client: Socket
// 	) : void {
// 		this._userService.updateUser({ id: user.id }, { status: Status.INGAME });
// 		this.server.emit('userJoinedGame', `${client.id} joined game`);
// 	}

// 	@SubscribeMessage('leave_game')
// 	leaveGame(
// 		@GetUser() user: User,
// 		@ConnectedSocket() client: Socket
// 	) : void {
// 		this._userService.updateUser({ id: user.id }, { status: Status.ONLINE });
// 		this.server.emit('userLeftGame', `${client.id} left game`);
// 	}
}