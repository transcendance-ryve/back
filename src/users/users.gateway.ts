import { UseGuards } from "@nestjs/common";
import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Status, User } from "@prisma/client";
import { Server, Socket } from 'socket.io';
import { JwtAuthGuard } from "./guard/jwt.guard";
import { UsersService } from "./users.service";

import { JwtService } from "@nestjs/jwt";

@WebSocketGateway({
	cors: {
		origin: 'http://localhost:5173',
	},
	credentials: true,
})
export class UsersGateway implements OnGatewayConnection, OnGatewayDisconnect {
	constructor(
		private readonly _userService: UsersService,
		private readonly _jwtService: JwtService,	
	) {}

	@WebSocketServer() private _server: Server;
	private _sockets: Map<string, Socket> = new Map()

	private _emitToFriends(id: string, event: string, data: any) {
		this._userService.getFriends(id).then((friends: Partial<User>[]) => {
			friends.forEach((friend: Partial<User>) => {
				const friendSocket = this._sockets.get(friend.id);
				if (friendSocket) {
					friendSocket.emit(event, data);
				}
			});
		});
	}

	async handleConnection(socket: Socket) {
		const { cookie } = socket.handshake?.headers;
		const accessToken = cookie?.split('=')?.pop();
		
		try {
			const user = await this._jwtService.verifyAsync(accessToken, { secret: 'wartek' });
			await this._userService.updateUser({ id: user.id }, { status: Status.ONLINE });
			
			this._sockets.set(user.id, socket);
			this._emitToFriends(user.id, 'user_connected', user.id);
	
			socket.data.id = user.id;
		} catch(err) { socket.disconnect(); }
	}

	async handleDisconnect(socket: Socket) {
		const { id } = socket.data || {};
		if (!id) return;

		await this._userService.updateUser({ id }, { status: Status.OFFLINE });
		this._emitToFriends(id, 'user_disconnected', id);
	}

	@SubscribeMessage('join_game')
	async handleJoinGame(socket: Socket) {
		const { id } = socket.data;
		if (!id) return;

		await this._userService.updateUser({ id }, { status: Status.INGAME });
		this._emitToFriends(id, 'user_joined_game', id);
	}

	@SubscribeMessage('leave_game')
	async handleLeaveGame(socket: Socket) {
		const { id } = socket.data;
		if (!id) return;

		await this._userService.updateUser({ id }, { status: Status.ONLINE });
		this._emitToFriends(id, 'user_left_game', id);
	}
}