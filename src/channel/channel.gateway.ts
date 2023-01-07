import { ChannelService } from './channel.service';
import { Channel, ChannelRole, ChannelType } from '@prisma/client';
import { CreateChannelDto, DirectMessageDto, IncomingMessageDto, JoinChannelDto, LeaveChannelDto } from './dto';
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
import { Req, UseGuards } from '@nestjs/common';
import { GetCurrentUserId } from '../decorators/user.decorator';
import { socketToUserId } from 'src/users/socketToUserIdStorage.service';

@WebSocketGateway({
	cors: {
		origin: '*',
	},
	credentials: true,
})
@UseGuards(JwtAuthGuard)
export class ChannelGateway implements OnGatewayConnection, OnGatewayDisconnect{
	@WebSocketServer()
	server: Server;
	constructor (private readonly channelService: ChannelService) {}

	async handleConnection() {
		console.log('user connected');
	}

	async handleDisconnect() {
		console.log('user disconnected');
	}

	@SubscribeMessage('connectToRoom')
	async connectToChannel(
		@GetCurrentUserId() userId: string,
		@MessageBody('channelId') channelId: string,
		@ConnectedSocket() clientSocket: Socket,
	) {
		const userOnChannel = await this.channelService.connectToChannel(
			userId,
			channelId,
			clientSocket,
		);
		if (userOnChannel != null) {
			this.server.to(clientSocket.id).emit('connectedToRoom', channelId);
		} else {
			this.server.to(clientSocket.id).emit('connectToRoomFailed');
		}
	}

	@SubscribeMessage('createRoom')
	async createChannel(
		@GetCurrentUserId() userId: string,
		@MessageBody('createInfo') dto: CreateChannelDto,
		@ConnectedSocket() clientSocket: Socket,
	) {
		let channel: Channel | string | null;
		channel = await this.channelService.createChannelWS(
			dto,
			userId,
			clientSocket,
		);
		if (typeof channel === 'string' || !channel) {
			this.server.to(clientSocket.id).emit('createRoomFailed', channel);
		} else {
			this.server.emit('roomCreated', channel.id, userId);
		}
	}

	@SubscribeMessage('directMessage')
	async createDirectMessage(
		@GetCurrentUserId() userId: string,
		@MessageBody('DMInfo') friendId: string,
		@ConnectedSocket() clientSocket: Socket,
	) {
		let channel: Channel | string | null;
		channel = await this.channelService.createDMChannelWS(
			userId,
			friendId,
			clientSocket,
		);
		if (typeof channel === 'string' || !channel) {
			this.server.to(clientSocket.id).emit('DMFailed', channel);
		} else {
			this.server.emit('DMCreated', channel.id, userId);
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
			this.server.to(clientSocket.id).emit('joinRoomFailed', joinedRoom);
		} else {
			this.server.to(dto.channelId).emit('roomJoined', joinedRoom.id, userId);
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

		if (messageSaved === null) {
			this.server.to(clientSocket.id).emit('messageRoomFailed');
			return false;
		} else {
			clientSocket.to(messageInfo.channelId).emit('incomingMessage', messageInfo.content);
			return true;
		}
	}

	@SubscribeMessage('leaveRoom')
	async deleteRoom(
		@GetCurrentUserId() userId: string,
		@MessageBody('leaveInfo') LeaveChannelDto: LeaveChannelDto,
		@ConnectedSocket() clientSocket: Socket,
	) {
		console.log('leaveRoom', LeaveChannelDto);
		const userLeaving = await this.channelService.leaveChannelWS(
			userId,
			LeaveChannelDto,
		);
		if (!userLeaving || typeof userLeaving === 'string') {
			this.server.to(clientSocket.id).emit('leaveRoomFailed', userLeaving);
		} else {
			this.server.to(LeaveChannelDto.channelId).emit('roomLeft', userId);
			await clientSocket.leave(LeaveChannelDto.channelId);
		}
	}
}