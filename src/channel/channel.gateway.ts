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
	constructor (private readonly channelService: ChannelService) {}

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

	@SubscribeMessage('ping')
	async ping(@ConnectedSocket() clientSocket: Socket) {
		this._server.to(clientSocket.id).emit('pong');
	}

	@SubscribeMessage('connectToRoom')
	async connectToChannel(
		@GetCurrentUserId() userId: string,
		@MessageBody('channelId') channelId: string,
		@ConnectedSocket() clientSocket: Socket,
	) {
		/*const userOnChannel = await this.channelService.connectToChannel(
			userId,
			channelId,
			clientSocket,
		);
		if (userOnChannel != null) {
			this._server.to(clientSocket.id).emit('connectedToRoom', channelId);
		} else {
			this._server.to(clientSocket.id).emit('connectToRoomFailed');
		}*/
		console.log('connectToRoom called');
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
			this._server.to(dto.channelId).emit('roomJoined', joinedRoom.id, userId);
		}
	}

	@SubscribeMessage('messageRoom')
	async sendMessage(
		@GetCurrentUserId() senderId: string,
		@MessageBody('messageInfo') messageInfo: IncomingMessageDto,
		@ConnectedSocket() clientSocket: Socket,
	) {

		const messageSaved = await this.channelService.storeMessage(
			senderId,
			messageInfo,
		);

		if (typeof messageSaved === 'string' || !messageSaved) {
			this._server.to(clientSocket.id).emit('messageRoomFailed', messageSaved);
		} else {
			console.log("ici");
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
			this._server.to(channelId).emit('roomLeft', userId);
			this._server.to(clientSocket.id).emit('roomLeft');
			await clientSocket.leave(channelId);
		}
	}

	@SubscribeMessage('inviteToRoom')
	async inviteToChannel(
		@GetCurrentUserId() userId: string,
		@MessageBody('inviteInfo') inviteInfo: InviteToChannelDto,
		@ConnectedSocket() clientSocket: Socket,
	) {
		const channelInvite = await this.channelService.inviteToChannelWS(
			userId,
			inviteInfo,
		);
		if (typeof channelInvite === 'string' || !channelInvite) {
			this._server.to(clientSocket.id).emit('inviteToRoomFailed', channelInvite);
		} else {
			const target : {
				id: string,
				username: string,
				avatar: string
			} = await this.channelService.getUserById(inviteInfo.friendId);
			this._server.to(clientSocket.id).emit('invitationSent', target);
			const friendSocket = UserIdToSockets.get(inviteInfo.friendId);
			if (friendSocket) {
				this._server
					.to(friendSocket.id)
					.emit('chanInvitationReceived', channelInvite);
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
			const user : Partial<User> = await this.channelService.getUserById(userId);
			this._server.to(channelInvite.id).emit('roomJoined', user);
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
			const user : Partial<User> = await this.channelService.getUserById(userId);
			this._server.to(inviteInfo.channelId).emit('roomDeclined', user);
		}
	}

	@SubscribeMessage('updateRole')
	async updateRole(
		@GetCurrentUserId() userId: string,
		@MessageBody('roleInfo') roleInfo: UpdateRoleDto,
		@ConnectedSocket() clientSocket: Socket,
	) {
		const roleUpdated = await this.channelService.updateRole(
			userId,
			roleInfo,
		);
		if (typeof roleUpdated === 'string' || !roleUpdated) {
			this._server.to(clientSocket.id).emit('updateRoleFailed', roleUpdated);
		} else {
			this._server.to(clientSocket.id).emit('roleUpdated');
		}
	}

	@SubscribeMessage('editRoom')
	async editChannel(
		@GetCurrentUserId() userId: string,
		@MessageBody('editInfo') editInfo: EditChannelDto,
		@ConnectedSocket() clientSocket: Socket,
	) {
		const channelEdited = await this.channelService.editChannel(
			userId,
			editInfo,
		);
		if (typeof channelEdited === 'string' || !channelEdited) {
			this._server.to(clientSocket.id).emit('editRoomFailed', channelEdited);
		} else {
			this._server.to(clientSocket.id).emit('roomEdited');
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
		);
		if (typeof userMuted === 'string' || !userMuted) {
			this._server.to(clientSocket.id).emit('muteUserFailed', userMuted);
		} else {
			this._server.to(clientSocket.id).emit('userMuted');
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
			this._server.to(clientSocket.id).emit('userUnmuted');
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
			this._server.to(clientSocket.id).emit('userBanned');
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
			this._server.to(clientSocket.id).emit('userUnbanned');
		}
	}

	@SubscribeMessage('blockUser')
	async blockUser(
		@GetCurrentUserId() userId: string,
		@MessageBody('blockUser') blockedUserId: string,
		@ConnectedSocket() clientSocket: Socket,
	) {
		const userBlocked = await this.channelService.blockUser(
			userId,
			blockedUserId,
		);
		if (typeof userBlocked === 'string' || !userBlocked) {
			this._server.to(clientSocket.id).emit('blockUserFailed', userBlocked);
		} else {
			this._server.to(clientSocket.id).emit('userBlocked');
		}
	}

	@SubscribeMessage('unblockUser')
	async unblockUser(
		@GetCurrentUserId() userId: string,
		@MessageBody('blockedUser') blockedUserId: string,
		@ConnectedSocket() clientSocket: Socket,
	) {
		const userBlocked = await this.channelService.unblockUser(
			userId,
			blockedUserId,
		);
		if (typeof userBlocked === 'string' || !userBlocked) {
			this._server.to(clientSocket.id).emit('unblockUserFailed', userBlocked);
		} else {
			this._server.to(clientSocket.id).emit('userUnblocked');
		}
	}
}