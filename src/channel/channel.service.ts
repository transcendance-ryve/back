import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Channel, ChannelUser, User, Message, ChannelType, ChannelInvitation, ChannelAction } from '@prisma/client';
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
import { Socket } from 'socket.io';
import * as bcrypt from 'bcrypt';
import { UserIdToSockets } from 'src/users/userIdToSockets.service';
import { SubscribeMessage } from '@nestjs/websockets';



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
			status: ChannelType;
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
				status: true,
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

	async getChannelInvitesByUser(userId: string) {
		try {
			const invites: {
				channel: {
					id: string;
					name: string;
					status: ChannelType;
				};
				senderId: string;
				id: string;
			}[] = await this.prisma.channelInvitation.findMany({
				where: {
					invitedUserId: userId,
				},
				select: {
					id: true,
					senderId: true,
					channel: {
						select: {
							id: true,
							name: true,
							status: true,
						},
					},
				},
			});
			return invites;
		} catch (error) {
			console.log(error);
			return error;
		}
	}

	async getChannelInvitesByChannel(channelId: string) {
		try {
			await this.isChannel(channelId);
			const invites: {
				invitedUser: {
					id: string;
					username: string;
				};
				id: string;
			}[] = await this.prisma.channelInvitation.findMany({
				where: {
					channelId: channelId,
				},
				select: {
					id: true,
					invitedUser: {
						select: {
							id: true,
							username: true,
						},
					},
				},
			});
			return invites;
		} catch (error) {
			console.log(error);
			return error;
		}
	}

	async getRoleOfUserOnChannel(userId: string, channelId: string) {
		try {
			await this.isChannel(channelId);
			const role: {
				role: string;
			} = await this.prisma.channelUser.findUnique({
				where: {
					userId_channelId: {
						userId: userId,
						channelId: channelId,
					},
				},
				select: {
					role: true,
				},
			});
			return role.role;
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
			if (dto.status === 'PROTECTED' && !dto.password)
				throw new Error('Password is required');
			if (!dto.name || dto.name === '')
				throw new Error('Channel name is required');
			if (dto.status === 'PROTECTED' && dto.password.length > 0) {
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
		dto: DirectMessageDto,
		clientSocket: Socket,
	) {
		try {
			const newDMChannel: Channel = await this.prisma.channel.create({
				data: {
					name: userId + dto.friendId,
					status: 'DIRECTMESSAGE',
					users: {
						create: [
							{
								userId: userId,
							},
							{
								userId: dto.friendId,
							},
						],
					},
					usersCount: 2,
				},
			});
			await clientSocket.join(newDMChannel.id);
			const friendSocket = UserIdToSockets.get(dto.friendId);
			if (friendSocket) {
				await friendSocket.join(newDMChannel.id);
			}
			return newDMChannel;
		} catch (err) {
			console.log(err);
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
			if (channelDto.status === 'PRIVATE') {
				const isInvited: ChannelInvitation | null = await this.prisma.channelInvitation.findFirst({
					where: {
						invitedUserId: userId,
					},
				});
				if (isInvited == null)
					throw new Error('Error: Not invited in private channel');
				await this.prisma.channelInvitation.delete({
					where: {
						id: isInvited.id,
					},
				});
			}
			else if (channelDto.status === 'PROTECTED') {
				if (!channelDto.password)
					throw new Error('Password is required');
				const channel: {
					status: ChannelType;
					password: string | null;
				} | null = await this.prisma.channel.findFirst({
					where: {
						id: channelDto.channelId,
						status: 'PROTECTED',
					},
					select: {
						status: true,
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
			const chan : {
				status: ChannelType;
			} | null = await this.prisma.channel.findFirst({
				where: {
					id: channelDto.channelId,
					name: channelDto.name,
				},
				select: {
					status: true,
				},
			});
			if (chan == null)
				throw new Error('channel not found');
			if (chan.status != channelDto.status)
				throw new Error('WrongData');
			//Join the channel
			const joinedChannel: Channel = await this.prisma.channel.update({
				where: {
					id: channelDto.channelId,
					name: channelDto.name,
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
			if (err)
				return (err.message as string);
			return 'Internal server error: error joining channel';
		}
	}


	async storeMessage(
		userId: string,
		messageInfo: IncomingMessageDto,
	) {
		try {
			await this.isChannel(messageInfo.channelId);
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
				console.log(messageInfo.content);
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
			await this.isChannel(dto.channelId);
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

	async inviteToChannelWS(
		userId: string,
		dto: InviteToChannelDto,
	) {
		try {
			//Check if user exists
			const user: User | null = await this.prisma.user.findUnique({
				where: {
					id: dto.friendId,
				},
			});
			if (user == null)
				throw new Error('User not found');
				await this.isChannel(dto.channelId);
				//Check if user is already in channel
			const channelUser: ChannelUser | null =
				await this.prisma.channelUser.findUnique({
					where: {
						userId_channelId: {
							userId: dto.friendId,
							channelId: dto.channelId,
						},
					},
				});
			if (channelUser != null)
				throw new Error('User already in channel');
			//Check if channel exists
			const channel: Channel | null = await this.prisma.channel.findUnique({
				where: {
					id: dto.channelId,
				},
			});
			if (channel == null)
				throw new Error('Channel not found');
			const channelInvite: ChannelInvitation | null =
				await this.prisma.channelInvitation.create({
					data: {
						senderId: userId,
						invitedUserId: dto.friendId,
						channelId: dto.channelId,
					},
				});
			return channelInvite;
		} catch (err) {
			console.log("err", err);
			if (err.code === 'P2002')
				return 'User already invited to channel';
			if (typeof err === 'string')
				return err;
			return 'Internal server error: error inviting user to channel';
		}
	}

	async acceptChanInvitation(
		userId: string,
		dto: InvitationDto,
		clientSocket: Socket,
	) {
		try {
			//Check if invitation exists
			const invitation: ChannelInvitation | null =
				await this.prisma.channelInvitation.findUnique({
					where: {
						id: dto.id,
					},
				});
			if (invitation == null)
				throw new Error('Invitation not found');
			await this.isChannel(invitation.channelId);
			//Check if user is already in channel
			const channelUser: ChannelUser | null =
				await this.prisma.channelUser.findUnique({
					where: {
						userId_channelId: {
							userId: userId,
							channelId: invitation.channelId,
						},
					},
				});
			if (channelUser != null)
				throw new Error('User already in channel');
			//Check if channel exists
			const channel: Channel | null = await this.prisma.channel.findUnique({
				where: {
					id: invitation.channelId,
				},
			});
			if (channel == null)
				throw new Error('Channel not found');
			//Add user to channel
			const joinedChannel: Channel = await this.prisma.channel.update({
				where: {
					id: invitation.channelId,
				},
				data: {
					usersCount: {
						increment: 1,
					},
					users: {
						create: {
							userId: userId,
						},
					},
				},
			});
			//Delete invitation
			await this.prisma.channelInvitation.delete({
				where: {
					id: invitation.id,
				},
			});
			await clientSocket.join(invitation.channelId);
			joinedChannel.password = '';
			return joinedChannel;
		} catch (err) {
			console.log("err", err);
			if (err)
				return err;
			return 'Internal server error: error accepting invitation';
		}
	}

	async declineChanInvitation(
		userId: string,
		dto: InvitationDto,
	) {
		try {
			//Check if invitation exists
			const invitation: ChannelInvitation | null =
			await this.prisma.channelInvitation.findUnique({
				where: {
					id: dto.id,
				},
			});
			if (invitation == null)
				throw new Error('Invitation not found');
			//Delete invitation
			await this.prisma.channelInvitation.delete({
				where: {
					id: invitation.id,
				},
			});
			return true;
		} catch (err) {
			return "Internal server error: error declining invitation"
		}
	}

	async updateRole(
		userId: string,
		dto: UpdateRoleDto,
	) {
		try {
			//Check if user exists
			const senderRole: string | null = 
			await this.getRoleOfUserOnChannel(userId, dto.channelId);
			if (senderRole === 'MEMBER')
				throw new Error('User dont have permission to update role');
			//Check if user exists and is not owner or admin
			const targetRole: string | null =
			await this.getRoleOfUserOnChannel(dto.userId, dto.channelId);
			if (targetRole === 'OWNER' || targetRole === 'ADMIN')
				throw new Error('User is owner or admin');

			const updatedChannelUser: ChannelUser | null =
			await this.prisma.channelUser.update({
				where: {
					userId_channelId: {
						userId: dto.userId,
						channelId: dto.channelId,
					},
				},
				data: {
					role: "ADMIN",
				},
			});
			if (updatedChannelUser == null)
				throw new Error('User not found');
			return updatedChannelUser;
		} catch (err) {
			if (err)
				return err.message;
			return 'Internal server error: error updating role';
		}
			
	}

	async editChannel(
		userId: string,
		dto: EditChannelDto,
	) {
		try {
			const senderRole: string | null =
			await this.getRoleOfUserOnChannel(userId, dto.channelId);
			if (senderRole != 'OWNER')
				throw new Error('User dont have permission to edit channel');
			if (dto.status === 'PROTECTED')
			{
				if (dto.password == null)
					throw new Error('Password is required');
				dto.password = await bcrypt.hash(dto.password, 10);
			}
			else if (dto.status === 'PUBLIC' || dto.status === 'PRIVATE')
				dto.password = null;
			const updatedChannel: Channel | null =
			await this.prisma.channel.update({
				where: {
					id: dto.channelId,
				},
				data: {
					name: dto.name,
					status: dto.status,
					password: dto.password,
				},
			});
			if (updatedChannel == null)
				throw new Error('Channel not found');
			return updatedChannel;
		} catch (err) {
			if (err)
				return err.message;
			return 'Internal server error: error editing channel';
		}
	}

	/*async muteUser(
		userId: string,
		dto: ModerateUserDto,
	) {
		try {
			const check = await this.checkIsValideModeration(userId, dto);
			if (check != true)
				throw new Error(check);
			const isMuted: ChannelAction | null = await this.prisma.channelAction.findFirst({
				where: {
					targetId: dto.targetId,
					type: 'MUTE',
				},
			});
			if (isMuted != null)
				throw new Error('User is already muted');
			const mutedUser: ChannelAction | null =
			await this.prisma.channelAction.create({
				data: {
					senderId: userId,
					targetId: dto.targetId,
					channelId: dto.channelId,
					channelActionTime: new Date(),
					type: 'MUTE',
				},
			});
			return mutedUser;
		} catch (err) {
			if (err)
				return err.message;
			return 'Internal server error: error muting user';
		}
	}*/
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

	async checkIsValideModeration(
		userId: string,
		moderateInfo: ModerateUserDto,
	) {
		try {
			const senderRole: string | null =
			await this.getRoleOfUserOnChannel(userId, moderateInfo.channelId);
			if (senderRole != 'OWNER' && senderRole != 'ADMIN')
				throw new Error('User dont have permission to moderate');
			const targetRole: string | null =
			await this.getRoleOfUserOnChannel(moderateInfo.targetId, moderateInfo.channelId);
			if (targetRole === 'OWNER' || targetRole === 'ADMIN')
				throw new Error('Target is owner or admin');
			const targetchannel: Channel | null =
			await this.prisma.channel.findFirst({
				where: {
					id: moderateInfo.channelId,
				},
			});
			if (targetchannel == null)
				throw new Error('Channel not found');
			if (targetchannel.status === 'DIRECTMESSAGE')
				throw new Error('Channel is direct message');
			return true;
		} catch (err) {
			if (err)
				return (err.message);
			return ('Internal server error: error moderating user');
		}
	}


}