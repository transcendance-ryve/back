import { Res, UseGuards } from "@nestjs/common";
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Status, User } from "@prisma/client";
import { Server, Socket } from 'socket.io';
import { JwtAuthGuard } from "./guard/jwt.guard";
import { UsersService } from "./users.service";
import { UserIdToSockets } from "./userIdToSockets.service";
import { JwtService } from "@nestjs/jwt";
import { GetCurrentUserId } from "src/decorators/user.decorator";
import { parse } from "cookie";

@WebSocketGateway({
	cors: {
		origin: process.env.FRONTEND_URL,
		credentials: true,
	},
})
@UseGuards(JwtAuthGuard)
export class UsersGateway implements OnGatewayConnection, OnGatewayDisconnect {
	constructor(
		private readonly _usersService: UsersService,
		private readonly _jwtService: JwtService,	
	) {}

	private _disconnectedTime: Map<string, number> = new Map();

	@WebSocketServer() private _server: Server;

	_emitToFriends(id: string, event: string, data: any) {
		this._usersService.getFriends(id).then((friends: Partial<User>[]) => {
			friends.forEach((friend: Partial<User>) => {
				UserIdToSockets.emit(friend.id, this._server, event, data);
			});
		}).catch(err => {
			UserIdToSockets.emit(id, this._server, 'get_friends_failure', "Couldn't get friends");
		})
	}

	async handleConnection(
		socket: Socket
	) {
		const { cookie } = socket.handshake?.headers;
		
		if (!cookie) return socket.disconnect();

		const accessToken = parse(cookie).access_token;

		try {
			if (!accessToken) throw new Error('No access token');
			const payload = await this._jwtService.verifyAsync(accessToken, { secret: process.env.JWT_SECRET });
			
			UserIdToSockets.set(payload.id, socket);
			
			const currentDate = new Date()
			const user = await this._usersService.getUser({ id: payload.id });
			if (!this._disconnectedTime.has(payload.id) || currentDate.getTime() - this._disconnectedTime.get(payload.id) > 5000) {
				this._emitToFriends(user.id, 'user_connected', { id: user.id, status: user.status, username: user.username, avatar: user.avatar });
				if (this._disconnectedTime.has(payload.id))
					this._disconnectedTime.delete(payload.id);
			}
			await this._usersService.updateUser({ id: user.id }, { status: Status.ONLINE });

			socket.data = user;
		} catch(err) { socket.disconnect() }
	}

	async handleDisconnect(socket: Socket) {
		const { id } = socket.data || {};
		if (!id) return;
		
		UserIdToSockets.delete(id, socket);
		if (!UserIdToSockets.get(id))
			await this._usersService.updateUser({ id }, { status: Status.OFFLINE });
		this._disconnectedTime.set(id, new Date().getTime());
		setTimeout(async () => {
			const user = await this._usersService.getUser({ id });
			
			if (!this._disconnectedTime.has(id) || user.status === Status.ONLINE || user.status === Status.INGAME) return;
			this._emitToFriends(user.id, 'user_disconnected', { id: user.id, status: user.status, username: user.username, avatar: user.avatar });
			this._disconnectedTime.delete(id)
		}, 5000);
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
		}).catch(err => {
			UserIdToSockets.emit(id, this._server, 'accept_friend_failure', "Couldn't accept friend request");
		});
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
		}).catch(err => {
			UserIdToSockets.emit(id, this._server, 'accept_decline_failure', "Couldn't decline friend request");
		});
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
		}).catch(err => {
			UserIdToSockets.emit(id, this._server, 'friend_request_failure', "Couldn't send friend request");
		});
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
		}).catch(err => {
			UserIdToSockets.emit(id, this._server, 'friend_removed_failure', "Couldn't remove friend");
		});
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
		}).catch(err => {
			UserIdToSockets.emit(id, this._server, 'used_blocked_failure', "Couldn't block user");
		});
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
		}).catch(err => {
			UserIdToSockets.emit(id, this._server, 'used_unblocked_failure', "Couldn't unblock user");
		});
	}
}