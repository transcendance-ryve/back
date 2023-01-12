import { UseGuards } from "@nestjs/common";
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Status, User } from "@prisma/client";
import { Server, Socket } from 'socket.io';
import { JwtAuthGuard } from "./guard/jwt.guard";
import { UsersService } from "./users.service";
import { UserIdToSockets } from "./userIdToSockets.service";
import { JwtService } from "@nestjs/jwt";
import { GetCurrentUserId } from "src/decorators/user.decorator";

@WebSocketGateway({
	cors: {
		origin: 'http://localhost:5173',
		credentials: true,
	},
})
@UseGuards(JwtAuthGuard)
export class UsersGateway implements OnGatewayConnection, OnGatewayDisconnect {
	constructor(
		private readonly _usersService: UsersService,
		private readonly _jwtService: JwtService,	
	) {}

	@WebSocketServer() private _server: Server;

	private _emitToFriends(id: string, event: string, data: any) {
		this._usersService.getFriends(id).then((friends: Partial<User>[]) => {
			friends.forEach((friend: Partial<User>) => {
				const friendSocket = UserIdToSockets.get(friend.id);
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
			await this._usersService.updateUser({ id: user.id }, { status: Status.ONLINE });
			
			UserIdToSockets.set(user.id, socket);
			this._emitToFriends(user.id, 'user_connected', user.id);
	
			socket.data.id = user.id;
		} catch(err) { socket.disconnect(); }
	}

	async handleDisconnect(socket: Socket) {
		const { id } = socket.data || {};
		if (!id) return;

		await this._usersService.updateUser({ id }, { status: Status.OFFLINE });
		this._emitToFriends(id, 'user_disconnected', id);
	}

	@SubscribeMessage('join_game')
	async handleJoinGame(socket: Socket) {
		const { id } = socket.data;
		if (!id) return;

		await this._usersService.updateUser({ id }, { status: Status.INGAME });
		this._emitToFriends(id, 'user_joined_game', id);
	}

	@SubscribeMessage('leave_game')
	async handleLeaveGame(socket: Socket) {
		const { id } = socket.data;
		if (!id) return;

		await this._usersService.updateUser({ id }, { status: Status.ONLINE });
		this._emitToFriends(id, 'user_left_game', id);
	}

	@SubscribeMessage('accept_friend')
	async handleAcceptFriend(
		@GetCurrentUserId() id: string,
		@MessageBody('friendId') friendId: string,
		@ConnectedSocket() socket: Socket,
	) {
		this._usersService.acceptFriendRequest(id, friendId).then(friendship => {
			const friendSocket = UserIdToSockets.get(friendId);
			if (friendSocket)
				this._server.to(friendSocket.id).emit('friend_accepted', friendship.receiver);
			this._server.to(socket.id).emit('friend_accepted_submitted', friendship.sender);
		});
	}

	@SubscribeMessage('decline_friend')
	async handleDeclineFriend(
		@GetCurrentUserId() id: string,
		@MessageBody('friendId') friendId: string,
		@ConnectedSocket() socket: Socket,
	) {
		this._usersService.removeFriendRequest(id, friendId).then(friendship => {
			const friendSocket = UserIdToSockets.get(friendId);
			if (friendSocket)
				this._server.to(friendSocket.id).emit('friend_declined', friendship.receiver);
			this._server.to(socket.id).emit('friend_declined_submitted', friendship.sender);
		});
	}
	
	@SubscribeMessage('add_friend')
	async handleAddFriend(
		@GetCurrentUserId() id: string,
		@MessageBody('friendId') friendId: string,
		@ConnectedSocket() socket: Socket,
	) {
		this._usersService.sendFriendRequest(id, friendId).then(friendship => {
			const friendSocket = UserIdToSockets.get(friendId);
			if (friendSocket)
				this._server.to(friendSocket.id).emit('friend_request', friendship.sender);
			this._server.to(socket.id).emit('friend_request_submitted', friendship.receiver);
		});
	}

	@SubscribeMessage('remove_friend')
	async handleRemoveFriend(
		@GetCurrentUserId() id: string,
		@MessageBody('friendId') friendId: string,
		@ConnectedSocket() socket: Socket,
	) {
		this._usersService.removeFriendRequest(id, friendId).then(friendship => {
			const friendSocket = UserIdToSockets.get(friendId);
			if (friendSocket)
				this._server.to(friendSocket.id).emit('friend_removed', friendship.sender);
			this._server.to(socket.id).emit('friend_removed_submitted', friendship.receiver);
		}).catch(err => console.log(err.message));
	}

}