import { UseGuards } from "@nestjs/common";
import { ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Status, User } from "@prisma/client";
import { Server, Socket } from 'socket.io';
import { GetUser } from "src/decorators/user.decorator";
import { JwtAuthGuard } from "./guard/jwt.guard";
import { UsersService } from "./users.service";

import { JwtService } from "@nestjs/jwt";

@WebSocketGateway({
	cors: {
		origin: 'http://localhost:5173',
	},
	credentials: true,
})
@UseGuards(JwtAuthGuard)
export class UsersGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer() server: Server;

	constructor(
		private readonly _userService: UsersService,
		private readonly _jwtService: JwtService,	
	) {}
	
	async handleConnection(socket: Socket) {
		const { cookie } = socket.handshake?.headers;
		const accessToken = cookie?.split('=')?.pop();

		try {
			const user = await this._jwtService.verifyAsync(accessToken, { secret: 'wartek' });
			this.server.emit('user_connected', `${socket.id} is connected`);
			socket.data.user = user;
			await this._userService.updateUser({ id: user.id }, { status: Status.ONLINE });
		} catch(err) {
			socket.disconnect();
		}
	}

	async handleDisconnect(socket: Socket) {
		const { id } = socket.data?.user || {};
		if (!id) return;

		await this._userService.updateUser({ id }, { status: Status.OFFLINE });
		this.server.emit('user_disconnected', `${socket.id} is disconnected`);
	}

	// @SubscribeMessage('join_game')
	// joinGame(
	// 	@GetUser() user: User,
	// 	@ConnectedSocket() client: Socket
	// ) : void {
	// 	this._userService.updateUser({ id: user.id }, { status: Status.INGAME });
	// 	this.server.emit('userJoinedGame', `${client.id} joined game`);
	// }

	// @SubscribeMessage('leave_game')
	// leaveGame(
	// 	@GetUser() user: User,
	// 	@ConnectedSocket() client: Socket
	// ) : void {
	// 	this._userService.updateUser({ id: user.id }, { status: Status.ONLINE });
	// 	this.server.emit('userLeftGame', `${client.id} left game`);
	// }
}