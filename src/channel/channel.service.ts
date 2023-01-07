import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Channel, ChannelUser, User, Message, ChannelType } from '@prisma/client';
import { ChannelActionType } from '@prisma/client';
import { CreateChannelDto, IncomingMessageDto, JoinChannelDto, LeaveChannelDto } from './dto';
import { Socket } from 'socket.io';
import * as bcrypt from 'bcrypt';
import { ChannelListener } from 'diagnostics_channel';

@Injectable()
export class ChannelService {
	constructor(private readonly prisma: PrismaService) {}

	//Getter
	getChannels() {
		return this.prisma.channel.findMany();
	}

	getChannelById(id: string) {
		return this.prisma.channel.findUnique({
			where: {
				id: id
			}
		});
	}

	async getMessagesOfChannel(channelId: string) {
		try {
			await this.isChannel(channelId);
			const messages: Message[] = await this.prisma.channel
				.findUnique({
					where: {
						id: channelId,
					},
				})
				.messages();
			return messages;
		} catch (error) {
			return error;
		}
	}

	async getChannelsByUserId(userId: string) {
		const channels: {
			id: string;
			name: string;
			type: ChannelType;
			usersCount: number;
		} [] = await this.prisma.channel.findMany({
			where: {
				users: {
					some: {
						userId: userId,
					},
				},
			},
			select: {
				id: true,
				name: true,
				type: true,
				usersCount: true,
			},
		});
		return channels;
	}

	async getUsersOfChannel(channelId: string) {
		try {
			await this.isChannel(channelId);
			const users: {
				user: {
					id: string;
					username: string;
				};
				role: string;
			}[] = await this.prisma.channelUser.findMany({
				where: {
					channelId: channelId,
				},
				select: {
					user: {
						select: {
							id: true,
							username: true,
						},
					},
					role: true,
				},
			});
			return users;
		} catch (error) {
			return error;
		}
	}

	//Actions
	async connectToChannel(
		userId: string,
		channelId: string,
		clientSocket: Socket,
	) {
		const userOnChannel: ChannelUser | null = await this.prisma.channelUser.findUnique({
			where: {
				userId_channelId: {
					userId: userId,
					channelId: channelId
				}
			}
		});
		if (userOnChannel != null)
			await clientSocket.join(channelId);
		return userOnChannel;
	}

	async createChannelWS(
		dto: CreateChannelDto,
		userId: string,
		clientSocket: Socket,
	) {
		//throw error if channel name is empty
		try {
			if (dto.type === 'PROTECTED' && !dto.password)
				throw new Error('Password is required');
			if (!dto.name || dto.name === '')
				throw new Error('Channel name is required');
			if (dto.type === 'PROTECTED' && dto.password.length > 0) {
				dto.password = await bcrypt.hash(dto.password, 10);
			}
			//try to create channel
			const createdChannel: Channel = await this.prisma.channel.create({
				data: {
					...dto,
					users: {
						create: {
							userId: userId,
							role: 'OWNER',
						},
					},
				},
			});
			createdChannel.password = '';
			await clientSocket.join(createdChannel.id);
			return createdChannel;
		} catch (err) {
			//if prisma return P2002 error
			if (err.code === 'P2002')
				return 'Channel name already exists';
			if (err === 'string' && err == 'Error: WrongData')
				return 'WrongData';
			console.log("err", err);
			return 'Internal server error: error creating channel';
		}
	}

	async createDMChannelWS(
		userId: string,
		friendid: string,
		clientSocket: Socket,
	) {
		try {
			const newDMChannel: Channel = await this.prisma.channel.create({
				data: {
					name: userId + friendid,
					type: 'DIRECTMESSAGE',
					users: {
						create: [
							{
								userId: userId,
							},
							{
								userId: friendid,
							},
						],
					},
					usersCount: 2,
				},
			});
			await clientSocket.join(newDMChannel.id);
			return newDMChannel;
		} catch (err) {
			if (err.code === 'P2002')
				return 'Channel name already exists';
			return 'Internal server error: error creating channel';
		}
	}

	async joinChannelWs(
		channelDto: JoinChannelDto,
		userId: string,
		clientSocket: Socket,
	) {
		try {
			//Check if private channel -> todo
			if (channelDto.type === 'PROTECTED') {
				if (!channelDto.password)
					throw new Error('Password is required');
				const channel: {
					type: ChannelType;
					password: string | null;
				} | null = await this.prisma.channel.findFirst({
					where: {
						id: channelDto.channelId,
						type: 'PROTECTED',
					},
					select: {
						type: true,
						password: true,
					},
				});
				if (channel == null)
					throw new Error('WrongData');
				if (channel.password != null) {
					const passwordMatch = await bcrypt.compare(
						channelDto.password,
						channel.password,
					);
					if (!passwordMatch)
						throw new Error('WrongPassword');
				}
			}
			//Join the channel
			const joinedChannel: Channel = await this.prisma.channel.update({
				where: {
					id: channelDto.channelId,
				},
				data: {
					users: {
						create: {
							userId: userId,
						},
					},
					usersCount: {
						increment: 1,
					},
				},
			});
			await clientSocket.join(channelDto.channelId);
			joinedChannel.password = '';
			return joinedChannel;
		} catch (err) {
			console.log("err", err);
			return 'Internal server error: error joining channel';
		}
	}


	async storeMessage(
		userId: string,
		messageInfo: IncomingMessageDto,
	) {
		try {
			const messageObj: { messages: Message[] } =
				await this.prisma.channel.update({
					where: {
						id: messageInfo.channelId,
					},
					data: {
						messages: {
							create: {
								senderId: userId,
								content: messageInfo.content,
							},
						},
					},
					select: {
						messages: true,
					},
				});
			return messageObj.messages[messageObj.messages.length - 1];
		} catch (err) {
			console.log("err", err);
			return 'Internal server error: error storing message';
		}
	}

	async leaveChannelWS(
		userId: string,
		dto: LeaveChannelDto
	) {
		try {	
			//remove user from channel users
			let leavingUser = await this.prisma.channelUser.delete({
				where: {
					userId_channelId: {
						userId: userId,
						channelId: dto.channelId,
					},
				},
			});
			const channelUsers: { users: ChannelUser[]} | null =
				await this.prisma.channel.findUnique({
					where: {
						id: dto.channelId,
					},
					select: {
						users: true,
					},
				});
			await this.prisma.channel.update({
				where: {
					id: dto.channelId,
				},
				data: {
					usersCount: {
						decrement: 1,
					},
				},
			});
			if ( channelUsers.users.length == 0) {
				await this.prisma.channel.delete({
					where: {
						id: dto.channelId,
					},
				});
			}
			return leavingUser;
		} catch (err) {
			console.log("err", err);
			if (err.code === 'P2025')
				return 'User not in channel';
			if (typeof err === 'string')
				return err;
			return 'Internal server error: error leaving channel';
		}
	}

	// utils
	async isChannel(channelId: string) {
		const channel: Channel | null = await this.prisma.channel.findUnique({
			where: {
				id: channelId,
			},
		});
		if (channel == null)
			throw new Error('Channel not found');
	}
}