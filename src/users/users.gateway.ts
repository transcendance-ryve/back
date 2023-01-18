import { Res, UseGuards } from "@nestjs/common";
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Status, User } from "@prisma/client";
import { Server, Socket } from 'socket.io';
import { JwtAuthGuard } from "./guard/jwt.guard";
import { UsersService } from "./users.service";
import { UserIdToSockets } from "./userIdToSockets.service";
import { JwtService } from "@nestjs/jwt";
import { GetCurrentUserId } from "src/decorators/user.decorator";
import { userInfo } from "os";
import { Response } from "express";

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
				UserIdToSockets.emit(friend.id, this._server, event, data);
			});
		});
	}

	async handleConnection(
		socket: Socket
	) {
		const { cookie } = socket.handshake?.headers;
		const accessToken = cookie?.split('=')?.pop();
		
		try {
			const payload = await this._jwtService.verifyAsync(accessToken, { secret: 'wartek' });
			
			UserIdToSockets.set(payload.id, socket);
			
			const currentDate = new Date()
			const user = await this._usersService.getUser({ id: payload.id });
			if (currentDate.getTime() - user.updatedAt.getTime() > 5000)
				this._emitToFriends(user.id, 'user_connected', { id: user.id, status: user.status, username: user.username, avatar: user.avatar });
			await this._usersService.updateUser({ id: user.id }, { status: Status.ONLINE });

			socket.data = user;
		} catch(err) { socket.disconnect() }
	}

	async handleDisconnect(socket: Socket) {
		const { id } = socket.data || {};
		if (!id) return;
		
		UserIdToSockets.delete(id, socket);
		await this._usersService.updateUser({ id }, { status: Status.OFFLINE });
		setTimeout(async () => {
			const user = await this._usersService.getUser({ id });

			if (user.status === Status.ONLINE) return;
			this._emitToFriends(user.id, 'user_disconnected', { id: user.id, status: user.status, username: user.username, avatar: user.avatar });
		}, 5000);
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
			UserIdToSockets.emit(friendId, this._server, 'friend_accepted', friendship.receiver);
			UserIdToSockets.emit(id, this._server, 'friend_accepted_submitted', friendship.sender);
		}).catch(err => console.log(err.message));
	}

	@SubscribeMessage('decline_friend')
	async handleDeclineFriend(
		@GetCurrentUserId() id: string,
		@MessageBody('friendId') friendId: string,
		@ConnectedSocket() socket: Socket,
	) {
		this._usersService.removeFriendRequest(id, friendId).then(friendship => {
			UserIdToSockets.emit(friendId, this._server, 'friend_declined', friendship.sender);
			UserIdToSockets.emit(id, this._server, 'friend_declined_submitted', friendship.receiver);
		}).catch(err => console.log(err.message));
	}
	
	@SubscribeMessage('add_friend')
	async handleAddFriend(
		@GetCurrentUserId() id: string,
		@MessageBody('friendId') friendId: string,
		@ConnectedSocket() socket: Socket,
	) {
		this._usersService.sendFriendRequest(id, friendId).then(friendship => {
			UserIdToSockets.emit(friendId, this._server, 'friend_request', friendship.sender);
			UserIdToSockets.emit(id, this._server, 'friend_request_submitted', friendship.receiver);
		}).catch(err => console.log(err.message));
	}

	@SubscribeMessage('remove_friend')
	async handleRemoveFriend(
		@GetCurrentUserId() id: string,
		@MessageBody('friendId') friendId: string,
		@ConnectedSocket() socket: Socket,
	) {
		this._usersService.removeFriendRequest(id, friendId).then(friendship => {
			UserIdToSockets.emit(friendId, this._server, 'friend_removed', friendship.sender);
			UserIdToSockets.emit(id, this._server, 'friend_removed_submitted', friendship.receiver);
		}).catch(err => console.log(err.message));
	}

	@SubscribeMessage('block_user')
	handleBlockUser(
		@GetCurrentUserId() id: string,
		@MessageBody('blockedId') blockedId: string,
		@ConnectedSocket() socket: Socket,
	) {
		this._usersService.blockUser(id, blockedId).then(blocked => {
			UserIdToSockets.emit(blockedId, this._server, 'user_blocked', blocked.sender);
			UserIdToSockets.emit(id, this._server, 'user_blocked_submitted', blocked.receiver);
		}).catch(err => console.log(err.message));
	}

	@SubscribeMessage('unblock_user')
	handleUnblockUser(
		@GetCurrentUserId() id: string,
		@MessageBody('blockedId') blockedId: string,
		@ConnectedSocket() socket: Socket,
	) {
		this._usersService.unblockUser(id, blockedId).then(blocked => {
			UserIdToSockets.emit(blockedId, this._server, 'user_unblocked', blocked.sender);
			UserIdToSockets.emit(id, this._server, 'user_unblocked_submitted', blocked.receiver);
		}).catch(err => console.log(err.message));
	}
}