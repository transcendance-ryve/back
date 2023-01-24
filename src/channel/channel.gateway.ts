import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { UserIdToSockets } from 'src/users/userIdToSockets.service';
import { UseGuards } from '@nestjs/common';
import { Channel, User } from '@prisma/client';
import {
	WebSocketGateway,
	WebSocketServer,
	SubscribeMessage,
	MessageBody,
	ConnectedSocket,
	OnGatewayConnection,
	OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtAuthGuard } from '../users/guard/jwt.guard';
import ChannelService from './channel.service';
import {
	DirectMessageDto,
	IncomingMessageDto,
	JoinChannelDto,
	InviteToChannelDto,
	InvitationDto,
	UpdateRoleDto,
	ModerateUserDto,
} from './dto';
import { GetCurrentUserId } from '../decorators/user.decorator';
import { UserTag } from './interfaces/utils.interfaces';
import { parse } from 'cookie';

@WebSocketGateway({
	cors: {
		origin: process.env.FRONTEND_URL,
		credentials: true,
	},
})
@UseGuards(JwtAuthGuard)
export default class ChannelGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
		_server: Server;

	constructor(
		// eslint-disable-next-line no-unused-vars
		private readonly channelService: ChannelService,
		// eslint-disable-next-line no-unused-vars
		private readonly userService: UsersService,
		// eslint-disable-next-line no-unused-vars
		private readonly _jwtService: JwtService,
	// eslint-disable-next-line no-empty-function
	) {}

	async handleConnection(
		@ConnectedSocket() clientSocket: Socket,
	): Promise<void> {
		try {
			const { cookie } = clientSocket.handshake?.headers;
			if (!cookie || !cookie.includes('access_token')) return;
			const cookies = parse(clientSocket.handshake?.headers.cookie);
			if(!cookies.access_token) return;
			const payload = await this._jwtService.verifyAsync(cookies.access_token, { secret: process.env.JWT_SECRET });
			await this.channelService.connectToMyChannels(payload.id);
		} catch (e) {
			if (e.message === 'invalid signature') return;
		}
	}

	// eslint-disable-next-line class-methods-use-this, no-empty-function
	async handleDisconnect(): Promise<void> {}

	@SubscribeMessage('getRole')
	async getRole(
		@MessageBody('channelId') channelId: string,
		@GetCurrentUserId() userId: string,
	): Promise<void> {
		try{
			const role = await this.channelService.getRole(userId, channelId);
			UserIdToSockets.emit(userId, this._server, 'role', role);
		} catch (e) {
			UserIdToSockets.emit(userId, this._server, 'roleFailed', e.message);
		}
	}

	@SubscribeMessage('DM')
	async createDirectMessage(
		@GetCurrentUserId() userId: string,
		@MessageBody('DMInfo') dto: DirectMessageDto,
	): Promise<void> {
		const channel:
		Channel | string | null = await this.channelService.createDMChannelWS(
			userId,
			dto,
		);
		if (typeof channel === 'string' || !channel) {
			UserIdToSockets.emit(userId, this._server, 'DMFailed', channel);
		} else {
			UserIdToSockets.emit(userId, this._server, 'DMChan', channel.id);
		}
	}

	@SubscribeMessage('joinRoom')
	async joinChannel(
		@GetCurrentUserId() userId: string,
		@MessageBody('joinInfo') dto: JoinChannelDto,
	): Promise<void> {
		const joinedRoom = await this.channelService.joinChannelWs(
			dto,
			userId,
			this._server,
		);
		if (typeof joinedRoom === 'string' || !joinedRoom) {
			UserIdToSockets.emit(userId, this._server, 'joinRoomFailed', joinedRoom);
		} else {
			const user:
			UserTag | string = await this.channelService.getUserTag(dto.channelId, userId);
			this._server.to(dto.channelId).emit('newUserInRoom', user);
			UserIdToSockets.emit(userId, this._server, 'joinRoomSuccess', joinedRoom.id);
		}
	}

	@SubscribeMessage('messageRoom')
	async sendMessage(
		@GetCurrentUserId() senderId: string,
		@MessageBody('messageInfo') messageInfo: IncomingMessageDto,
	): Promise<void> {
		const messageSaved = await this.channelService.saveMessage(
			senderId,
			messageInfo,
		);
		if (typeof messageSaved === 'string' || !messageSaved) {
			UserIdToSockets.emit(senderId, this._server, 'messageRoomFailed', messageSaved);
		} else {
			this._server.to(messageInfo.channelId).emit('incomingMessage', messageSaved, messageInfo.channelId);
		}
	}

	@SubscribeMessage('leaveRoom')
	async deleteRoom(
		@GetCurrentUserId() userId: string,
		@MessageBody('channelId') channelId: string,
		@ConnectedSocket() clientSocket: Socket,
	): Promise<void> {
		const userLeaving = await this.channelService.leaveChannelWS(
			userId,
			channelId,
		);
		if (!userLeaving || typeof userLeaving === 'string') {
			UserIdToSockets.emit(userId, this._server, 'leaveRoomFailed', userLeaving);
		} else {
			this._server.to(channelId).emit('userLeftTheRoom', userId);
			await clientSocket.leave(channelId);
			UserIdToSockets.emit(userId, this._server, 'roomLeft');
		}
	}

	@SubscribeMessage('inviteToRoom')
	async inviteToChannel(
		@GetCurrentUserId() userId: string,
		@MessageBody('inviteInfo') inviteInfo: InviteToChannelDto,
		@ConnectedSocket() clientSocket: Socket,
	): Promise<void> {
		const res = await this.channelService.inviteToChannelWS(
			userId,
			inviteInfo,
		);
		if (typeof res === 'string' || !res) {
			this._server.to(clientSocket.id).emit('inviteToRoomFailed', res.channelInvite);
		} else {
			const target:
			UserTag | string = await this.channelService.getPendingUserTag(inviteInfo.friendId);
			this._server.to(inviteInfo.channelId).emit('invitationSent', target);
			UserIdToSockets.emit(userId, this._server, 'inviteToRoomSuccess', target);
			UserIdToSockets.emit(inviteInfo.friendId, this._server, 'chanInvitationReceived', res.channel);
		}
	}

	@SubscribeMessage('acceptInvitation')
	async acceptInvitation(
		@GetCurrentUserId() userId: string,
		@MessageBody('invitationInfo') inviteInfo: InvitationDto,
	): Promise<void> {
		const channelInvite = await this.channelService.acceptChanInvitation(
			userId,
			inviteInfo,
		);
		if (typeof channelInvite === 'string' || !channelInvite) {
			UserIdToSockets.emit(userId, this._server, 'acceptInvitationFailed', channelInvite);
		} else {
			UserIdToSockets.emit(userId, this._server, 'invitationAccepted', channelInvite.id);
			const user: UserTag | string = await this.channelService.getUserTag(channelInvite.id, userId);
			this._server.to(channelInvite.id).emit('newUserInRoom', user);
		}
	}

	@SubscribeMessage('declineInvitation')
	async declineInvitation(
		@GetCurrentUserId() userId: string,
		@MessageBody('invitationInfo') inviteInfo: InvitationDto,
	): Promise<void> {
		const channelInvite = await this.channelService.declineChanInvitation(
			userId,
			inviteInfo,
		);
		if (typeof channelInvite === 'string' || !channelInvite) {
			UserIdToSockets.emit(userId, this._server, 'declineInvitationFailed');
		} else {
			UserIdToSockets.emit(userId, this._server, 'invitationDeclined', inviteInfo.channelId);
			const user : Partial<User> = await this.userService.getUser({ id: userId }, 'id,username,avatar,status');
			this._server.to(inviteInfo.channelId).emit('roomDeclined', user);
		}
	}

	@SubscribeMessage('promoteUser')
	async updateRole(
		@GetCurrentUserId() userId: string,
		@MessageBody('roleInfo') roleInfo: UpdateRoleDto,
	): Promise<void> {
		const roleUpdated = await this.channelService.promoteUser(
			userId,
			roleInfo,
		);
		if (typeof roleUpdated === 'string' || !roleUpdated) {
			UserIdToSockets.emit(userId, this._server, 'promoteUserFailed', roleUpdated);
		} else {
			const user : Partial<User> = await this.userService.getUser({ id: roleUpdated.userId }, 'id,username,avatar');
			this._server.to(roleInfo.channelId).emit('userPromoted', user);
		}
	}

	@SubscribeMessage('demoteUser')
	async demoteUser(
		@GetCurrentUserId() userId: string,
		@MessageBody('roleInfo') roleInfo: UpdateRoleDto,
	): Promise<void> {
		const roleUpdated = await this.channelService.demoteUser(
			userId,
			roleInfo,
		);
		if (typeof roleUpdated === 'string' || !roleUpdated) {
			UserIdToSockets.emit(userId, this._server, 'demoteUserFailed', roleUpdated);
		} else {
			const user : Partial<User> = await this.userService.getUser({ id: roleUpdated.userId }, 'id,username,avatar');
			this._server.to(roleInfo.channelId).emit('userDemoted', user);
		}
	}

	@SubscribeMessage('muteUser')
	async muteUser(
		@GetCurrentUserId() userId: string,
		@MessageBody('muteInfo') muteInfo: ModerateUserDto,
	): Promise<void> {
		const userMuted = await this.channelService.muteUser(
			userId,
			muteInfo,
			this._server,
		);
		if (typeof userMuted === 'string' || !userMuted) {
			UserIdToSockets.emit(userId, this._server, 'muteUserFailed', userMuted);
		} else {
			this._server.to(muteInfo.channelId).emit('userMuted', muteInfo.targetId);
		}
	}

	@SubscribeMessage('unmuteUser')
	async unmuteUser(
		@GetCurrentUserId() userId: string,
		@MessageBody('muteInfo') muteInfo: ModerateUserDto,
	): Promise<void> {
		const userMuted = await this.channelService.unmuteUser(
			userId,
			muteInfo,
		);
		if (typeof userMuted === 'string' || !userMuted) {
			UserIdToSockets.emit(userId, this._server, 'unmuteUserFailed', userMuted);
		} else {
			this._server.to(muteInfo.channelId).emit('userUnmuted', muteInfo.targetId);
		}
	}

	@SubscribeMessage('banUser')
	async banUser(
		@GetCurrentUserId() userId: string,
		@MessageBody('banInfo') banInfo: ModerateUserDto,
	): Promise<void> {
		const userBanned = await this.channelService.banUser(
			userId,
			banInfo,
		);
		if (typeof userBanned === 'string' || !userBanned) {
			UserIdToSockets.emit(userId, this._server, 'banUserFailed', userBanned);
		} else {
			this._server.to(banInfo.channelId).emit('userBanned', userBanned);
			UserIdToSockets.get(banInfo.targetId)?.forEach((socket) => {
				socket.leave(banInfo.channelId);
			});
			const chanName:
			Partial<Channel> | null = await this.channelService.getChannelById({ id: banInfo.channelId }, 'id,name');
			UserIdToSockets.emit(banInfo.targetId, this._server, 'banned', chanName);
		}
	}

	@SubscribeMessage('unbanUser')
	async unbanUser(
		@GetCurrentUserId() userId: string,
		@MessageBody('banInfo') banInfo: ModerateUserDto,
	): Promise<void> {
		const userBanned = await this.channelService.unbanUser(
			userId,
			banInfo,
		);
		if (typeof userBanned === 'string' || !userBanned) {
			UserIdToSockets.emit(userId, this._server, 'unbanUserFailed', userBanned);
		} else {
			this._server.to(banInfo.channelId).emit('userUnbanned', banInfo.targetId);
		}
	}

	@SubscribeMessage('isBlocked')
	async isBlocked(
		@GetCurrentUserId() userId: string,
		@MessageBody('targetId') targetId: string,
	): Promise<void> {
		const isBlocked: boolean = await this.channelService.isBlocked(userId, targetId);
		UserIdToSockets.emit(userId, this._server, 'blockStatus', isBlocked, targetId);
	}

	@SubscribeMessage('isBlockedRelation')
	async isBlockedRelation(
		@GetCurrentUserId() userId: string,
		@MessageBody('targetId') targetId: string,
	): Promise<void> {
		const isBlocked:
		boolean | string = await this.channelService.isBlockedRelation(userId, targetId);
		if (isBlocked === 'target_blocked') UserIdToSockets.emit(userId, this._server, 'targetBlocked', targetId);
		else if (isBlocked === 'user_blocked') UserIdToSockets.emit(userId, this._server, 'userBlocked', targetId);
		else UserIdToSockets.emit(userId, this._server, 'noBlockedRelation');
	}
}
