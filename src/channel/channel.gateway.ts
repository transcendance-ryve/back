import { ChannelService } from './channel.service';
import { Channel, ChannelRole, ChannelType, User } from '@prisma/client';
import {
	CreateChannelDto,
	DirectMessageDto,
	IncomingMessageDto,
	JoinChannelDto,
	LeaveChannelDto,
	InviteToChannelDto,
	InvitationDto,
	UpdateRoleDto,
	EditChannelDto,
	ModerateUserDto,
} from './dto';
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
import {
	Req,
	UseGuards,
	UploadedFile,
	UseInterceptors,
	BadRequestException
} from '@nestjs/common';
import { GetCurrentUserId } from '../decorators/user.decorator';
import { UserIdToSockets } from 'src/users/userIdToSockets.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { type } from 'os';
import { UsersService } from 'src/users/users.service';
import { UserTag } from './interfaces/UserTag.interface';


@WebSocketGateway({
	cors: {
		origin: '*',
		credentials: true,
	},
})
@UseGuards(JwtAuthGuard)
export class ChannelGateway implements OnGatewayConnection, OnGatewayDisconnect{
	@WebSocketServer()
	_server: Server;
	constructor (
		private readonly channelService: ChannelService,
		private readonly userService: UsersService,
		) {}

	async handleConnection(
		@ConnectedSocket() clientSocket: Socket,
		@GetCurrentUserId() userId: string,
	) {
		console.log('user connected');
		await this.channelService.connectToMyChannels(userId, clientSocket);
	}

	async handleDisconnect() {
		console.log('user disconnected');
	}

	@SubscribeMessage('getRole')
	async getRole(
		@ConnectedSocket() clientSocket: Socket,
		@MessageBody('channelId') channelId: string,
		@GetCurrentUserId() userId: string,
	) {
		const role = await this.channelService.getRole(userId, channelId);
		this._server.to(clientSocket.id).emit('role', role);
	}

	@SubscribeMessage('ping')
	async ping(@ConnectedSocket() clientSocket: Socket) {
		this._server.to(clientSocket.id).emit('pong');
	}

	@SubscribeMessage('DM')
	async createDirectMessage(
		@GetCurrentUserId() userId: string,
		@MessageBody('DMInfo') dto: DirectMessageDto,
		@ConnectedSocket() clientSocket: Socket,
	) {
		let channel: Channel | string | null;
		channel = await this.channelService.createDMChannelWS(
			userId,
			dto,
			clientSocket,
		);
		if (typeof channel === 'string' || !channel) {
			this._server.to(clientSocket.id).emit('DMFailed', channel);
		} else {
			this._server.to(clientSocket.id).emit('DMChan', channel.id);
		}
	}
	
	@SubscribeMessage('joinRoom')
	async joinChannel(
		@GetCurrentUserId() userId: string,
		@MessageBody('joinInfo') dto: JoinChannelDto,
		@ConnectedSocket() clientSocket: Socket,
	) {
		const joinedRoom = await this.channelService.joinChannelWs(
			dto,
			userId,
			clientSocket,
		);
		if (typeof joinedRoom === 'string' || !joinedRoom) {
			this._server.to(clientSocket.id).emit('joinRoomFailed', joinedRoom);
		} else {
			const user: UserTag | string =
			await this.channelService.getUserTag(dto.channelId, userId);
			this._server.to(dto.channelId).emit('newUserInRoom', user);
			this._server.to(clientSocket.id).emit('joinRoomSuccess', joinedRoom.id);
		}
	}

	@SubscribeMessage('messageRoom')
	async sendMessage(
		@GetCurrentUserId() senderId: string,
		@MessageBody('messageInfo') messageInfo: IncomingMessageDto,
		@ConnectedSocket() clientSocket: Socket,
	) {

		const messageSaved = await this.channelService.saveMessage(
			senderId,
			messageInfo,
		);

		if (typeof messageSaved === 'string' || !messageSaved) {
			this._server.to(clientSocket.id).emit('messageRoomFailed', messageSaved);
		} else {
			this._server.to(messageInfo.channelId).emit('incomingMessage', messageInfo.content);
		}
	}

	@SubscribeMessage('leaveRoom')
	async deleteRoom(
		@GetCurrentUserId() userId: string,
		@MessageBody('channelId') channelId: string,
		@ConnectedSocket() clientSocket: Socket,
	) {
		console.log('leaveRoom', LeaveChannelDto);
		const userLeaving = await this.channelService.leaveChannelWS(
			userId,
			channelId,
		);
		if (!userLeaving || typeof userLeaving === 'string') {
			this._server.to(clientSocket.id).emit('leaveRoomFailed', userLeaving);
		} else {
			this._server.to(channelId).emit('userLeftTheRoom', userId);
			await clientSocket.leave(channelId);
			this._server.to(clientSocket.id).emit('roomLeft');
		}
	}

	@SubscribeMessage('inviteToRoom')
	async inviteToChannel(
		@GetCurrentUserId() userId: string,
		@MessageBody('inviteInfo') inviteInfo: InviteToChannelDto,
		@ConnectedSocket() clientSocket: Socket,
	) {
		const res = await this.channelService.inviteToChannelWS(
			userId,
			inviteInfo,
		);
		if (typeof res === 'string' || !res) {
			this._server.to(clientSocket.id).emit('inviteToRoomFailed', res.channelInvite);
		} else {
			const target: UserTag | string =
			await this.channelService.getPendingUserTag(inviteInfo.friendId);
			this._server.to(inviteInfo.channelId).emit('invitationSent', target);
			const friendSocket = UserIdToSockets.get(inviteInfo.friendId);
			if (friendSocket) {
				this._server
					.to(friendSocket.id)
					.emit('chanInvitationReceived', res.channel);
			}
		}
	}

	@SubscribeMessage('acceptInvitation')
	async acceptInvitation(
		@GetCurrentUserId() userId: string,
		@MessageBody('invitationInfo') inviteInfo: InvitationDto,
		@ConnectedSocket() clientSocket: Socket,
	) {
		const channelInvite = await this.channelService.acceptChanInvitation(
			userId,
			inviteInfo,
			clientSocket,
		);
		if (typeof channelInvite === 'string' || !channelInvite) {
			this._server.to(clientSocket.id).emit('acceptInvitationFailed', channelInvite);
		} else {
			this._server.to(clientSocket.id).emit('invitationAccepted', channelInvite.id);
			const user : UserTag | string =
			await this.channelService.getUserTag(channelInvite.id, userId);
			this._server.to(channelInvite.id).emit('newUserInRoom', user);
		}
	}

	@SubscribeMessage('declineInvitation')
	async declineInvitation(
		@GetCurrentUserId() userId: string,
		@MessageBody('invitationInfo') inviteInfo: InvitationDto,
		@ConnectedSocket() clientSocket: Socket,
	) {
		const channelInvite = await this.channelService.declineChanInvitation(
			userId,
			inviteInfo,
		);
		if (typeof channelInvite === 'string' || !channelInvite) {
			this._server.to(clientSocket.id).emit('declineInvitationFailed');
		} else {
			this._server.to(clientSocket.id).emit('invitationDeclined', inviteInfo.channelId);
			const user : Partial<User> = await this.userService.getUser({id: userId}, "id,username,avatar,status");
			this._server.to(inviteInfo.channelId).emit('roomDeclined', user);
		}
	}

	@SubscribeMessage('promoteUser')
	async updateRole(
		@GetCurrentUserId() userId: string,
		@MessageBody('roleInfo') roleInfo: UpdateRoleDto,
		@ConnectedSocket() clientSocket: Socket,
	) {
		const roleUpdated = await this.channelService.promoteUser(
			userId,
			roleInfo,
		);
		if (typeof roleUpdated === 'string' || !roleUpdated) {
			this._server.to(clientSocket.id).emit('promoteUserFailed', roleUpdated);
		} else {
			const user : Partial<User> = await this.userService.getUser({id: roleUpdated.userId}, "id,username,avatar");
			this._server.to(roleInfo.channelId).emit('userPromoted', user);
		}
	}

	@SubscribeMessage('demoteUser')
	async demoteUser(
		@GetCurrentUserId() userId: string,
		@MessageBody('roleInfo') roleInfo: UpdateRoleDto,
		@ConnectedSocket() clientSocket: Socket,
	) {
		const roleUpdated = await this.channelService.demoteUser(
			userId,
			roleInfo,
		);
		if (typeof roleUpdated === 'string' || !roleUpdated) {
			this._server.to(clientSocket.id).emit('demoteUserFailed', roleUpdated);
		} else {
			const user : Partial<User> = await this.userService.getUser({id: roleUpdated.userId}, "id,username,avatar");
			this._server.to(roleInfo.channelId).emit('userDemoted', user);
		}
	}

	@SubscribeMessage('muteUser')
	async muteUser(
		@GetCurrentUserId() userId: string,
		@MessageBody('muteInfo') muteInfo: ModerateUserDto,
		@ConnectedSocket() clientSocket: Socket,
	) {
		const userMuted = await this.channelService.muteUser(
			userId,
			muteInfo,
			this._server,
		);
		if (typeof userMuted === 'string' || !userMuted) {
			this._server.to(clientSocket.id).emit('muteUserFailed', userMuted);
		} else {
			this._server.to(muteInfo.channelId).emit('userMuted', muteInfo.targetId);
		}
	}

	@SubscribeMessage('unmuteUser')
	async unmuteUser(
		@GetCurrentUserId() userId: string,
		@MessageBody('muteInfo') muteInfo: ModerateUserDto,
		@ConnectedSocket() clientSocket: Socket,
	) {
		const userMuted = await this.channelService.unmuteUser(
			userId,
			muteInfo,
		);
		if (typeof userMuted === 'string' || !userMuted) {
			this._server.to(clientSocket.id).emit('unmuteUserFailed', userMuted);
		} else {
			this._server.to(muteInfo.channelId).emit('userUnmuted', muteInfo.targetId);
		}
	}

	@SubscribeMessage('banUser')
	async banUser(
		@GetCurrentUserId() userId: string,
		@MessageBody('banInfo') banInfo: ModerateUserDto,
		@ConnectedSocket() clientSocket: Socket,
	) {
		const userBanned = await this.channelService.banUser(
			userId,
			banInfo,
		);
		if (typeof userBanned === 'string' || !userBanned) {
			this._server.to(clientSocket.id).emit('banUserFailed', userBanned);
		} else {
			this._server.to(banInfo.channelId).emit('userBanned', userBanned);
		}
	}

	@SubscribeMessage('unbanUser')
	async unbanUser(
		@GetCurrentUserId() userId: string,
		@MessageBody('banInfo') banInfo: ModerateUserDto,
		@ConnectedSocket() clientSocket: Socket,
	) {
		const userBanned = await this.channelService.unbanUser(
			userId,
			banInfo,
		);
		if (typeof userBanned === 'string' || !userBanned) {
			this._server.to(clientSocket.id).emit('unbanUserFailed', userBanned);
		} else {
			this._server.to(banInfo.channelId).emit('userUnbanned', banInfo.targetId);
		}
	}
}