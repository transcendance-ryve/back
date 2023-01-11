import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import {
	Channel,
	ChannelUser,
	User,
	Message,
	ChannelType,
	ChannelInvitation,
	ChannelAction,
	blockedUser,
	Friendship,
} from '@prisma/client';
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
import { Socket, Server } from 'socket.io';
import * as bcrypt from 'bcrypt';
import { UserIdToSockets } from 'src/users/userIdToSockets.service';
import { SubscribeMessage } from '@nestjs/websockets';
import * as fs from 'fs';




@Injectable()
export class ChannelService {
	constructor(private readonly prisma: PrismaService) {}

	//Getter
	getChannels(
		name: string,
	) : Promise<Channel[]> {
		if (!name)
			return;
		return this.prisma.channel.findMany({
			where: {
				name: {
					contains: name,
					mode: 'insensitive',
				},
			},
		});
	}

	getChannelById(id: string) : Promise<Channel> {
		return this.prisma.channel.findUnique({
			where: {
				id: id
			}
		});
	}

	async getMessagesOfChannel(channelId: string): Promise<any> {
		try {
			await this.isChannel(channelId);
			const messages: Message[] = await this.prisma.channel
				.findUnique({
					where: {
						id: channelId,
					},
				})
				.messages();
			let res : any = [];
			for (const message of messages) {
				res.push({
					content: message.content,
					createdAt: message.createdAt,
					sender: await this.prisma.user.findFirst({
							where: {
								id: message.senderId,
							},
							select: {
								id: true,
								username: true,
								avatar: true,
							},
						}),
				});
			}
			return res;
		} catch (error) {
			return error;
		}
	}

	async getChannelsByUserId(userId: string):
	Promise<Partial<Channel>[]> {
		const channels: Partial<Channel>[] = await this.prisma.channel.findMany({
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
				avatar: true,
				messages: {
					take: 1,
					orderBy: {
						createdAt: 'desc',
					},
					select: {
						content: true,
					},
				},
			},
		});
		return channels;
	}

	async getUsersOfChannel(channelId: string):
	Promise<Partial<ChannelUser>[]>
	{
		try {
			await this.isChannel(channelId);
			const users: Partial<ChannelUser>[] = await this.prisma.channelUser.findMany({
				where: {
					channelId: channelId,
				},
				select: {
					user: {
						select: {
							id: true,
							username: true,
							avatar: true,
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


	async getChannelInvitesByUser(userId: string):
	Promise<any>
	{
		try {
			const invites: {
				channel: {
					id: string;
					name: string;
					status: ChannelType;
					usersCount: number;
					avatar: string;
				};
			}[] = await this.prisma.channelInvitation.findMany({
				where: {
					invitedUserId: userId,
				},
				select: {
					channel: {
						select: {
							id: true,
							name: true,
							status: true,
							usersCount: true,
							avatar: true,
						},
					},
				},
			});
			let res:{ 
				id: string;
				name: string;
				status: ChannelType;
				usersCount: number;
			}[] =  invites.map((invite) => invite.channel);
			return res;
		} catch (error) {
			console.log(error);
			return error;
		}
	}

	async getChannelInvitesByChannel(channelId: string):
	Promise<any>
	{
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

	async getRoleOfUserOnChannel(userId: string, channelId: string):
	Promise<string>{
		try {
			await this.isChannel(channelId);
			const role: Partial<ChannelUser> =
			await this.prisma.channelUser.findUnique({
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
			return error.message;
		}
	}

	async getMutedUsersOfChannel(channelId: string):
	Promise<any>{
		try {
			await this.isChannel(channelId);
			const mutedUsers: {
				target: {
					id: string;
					username: string;
				};
			}[] = await this.prisma.channelAction.findMany({
				where: {
					channelId: channelId,
					type: 'MUTE',
				},
				select: {
					target: {
						select: {
							id: true,
							username: true,
						},
					},
				},
			});
			return mutedUsers;
		} catch (error) {
			return error.message;
		}
	}

	async getBlockedUsers(userId: string):
	Promise<any>{
		try {
			const blockedUsers: {
				blocked: {
					id: string;
					username: string;
				};
			}[] = await this.prisma.blockedUser.findMany({
				where: {
					userId: userId,
				},
				select: {
					blocked: {
						select: {
							id: true,
							username: true,
						},
					},
				},
			});
			return blockedUsers;
		} catch (error) {
			return error.message;
		}
	}

	async getBannedUsersOfChannel(channelId: string):
	Promise<any>{
		try {
			await this.isChannel(channelId);
			const res: {
				target: {
					id: string;
					username: string;
					avatar: string;
				};
			}[] =
				await this.prisma.channelAction.findMany({
				where: {
					channelId: channelId,
					type: 'BAN',
				},
				select: {
					target: {
						select: {
							id: true,
							username: true,
							avatar: true,
						},
					},
				},
			});
			return res;
		} catch (error) {
			return error.message;
		}
	}
	//Actions
	async connectToChannel(
		userId: string,
		channelId: string,
		clientSocket: Socket,
	): Promise<ChannelUser | null> {
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

	async connectToMyChannels(
		userId: string,
		clientSocket: Socket
	) {
		const channels: ChannelUser[] = await this.prisma.channelUser.findMany({
			where: {
				userId: userId
			}
		});
		channels.forEach(async (channel) => {
			await clientSocket.join(channel.channelId);
		});
	}

	async createChannelWS(
		dto: CreateChannelDto,
		userId: string,
		clientSocket: Socket,
		avatar: Express.Multer.File,
		_server: Server,
	) : Promise<Channel | string>{
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
			const staticPath = 'http://localhost:3000/';
			const createdChannel: Channel = await this.prisma.channel.create({
				data: {
					...dto,
					avatar: avatar ? staticPath + avatar.filename : staticPath + 'default.png',
					users: {
						create:{
							userId: userId,
							role: 'OWNER',
						},
					},
				},
			});
			if (dto.users != null) {
				//check if users exist
				const users: User[]  | null = await this.prisma.user.findMany({
					where: {
						id: {
							in: dto.users.id,
						},
					},
				});
				if(users != null)
				{
					//add users to channel
					for (const user of users) {
						let inviteDto: InviteToChannelDto = {
							channelId: createdChannel.id,
							friendId: user.id,
						};
						let chanInvite = await this.inviteToChannelWS(user.id, inviteDto);
						let userSocket = UserIdToSockets.get(user.id);
						_server.to(userSocket.id).emit('chanInvitationReceived', createdChannel);
					}
				}
			}
			delete createdChannel.password;
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
	) : Promise<Channel | string> {
		try {
			const isAlreadyDm: Friendship | null =
			await this.prisma.friendship.findFirst({
				where: {
					OR: [
						{
							sender_id: userId,
							receiver_id: dto.friendId,
						},
						{
							sender_id: dto.friendId,
							receiver_id: userId,
						},
					],
				},
			});
			if (isAlreadyDm && isAlreadyDm.channel_id != undefined) {
				const dmChannel: Channel | null =
				await this.prisma.channel.findFirst({
					where: {
						id: isAlreadyDm.channel_id,
					},
				});
				return dmChannel;
			}
			const newDMChannel: Channel = await this.prisma.channel.create({
				data: {
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
			const friendShip: Partial<Friendship> | null =
			await this.prisma.friendship.findFirst({
				where: {
					OR: [
						{
							sender_id: userId,
							receiver_id: dto.friendId,
						},
						{
							sender_id: dto.friendId,
							receiver_id: userId,
						},
					]
				},
				select: {
					id: true,
				},
			});
			await this.prisma.friendship.update({
				where: {
					id: friendShip.id,
				},
				data: {
					channel_id: newDMChannel.id,
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
			else if(err)
				return err.message;
			return 'Internal server error: error creating channel';
		}
	}

	async joinChannelWs(
		channelDto: JoinChannelDto,
		userId: string,
		clientSocket: Socket,
	) : Promise<Channel | string> {
		try {
			const isBanned: boolean = await this.isBanned(userId, channelDto.channelId);
			if (isBanned)
				throw new Error('Error: User is banned');
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
				const channel: Partial<Channel> | null = await this.prisma.channel.findFirst({
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
			const chan : Partial<Channel> | null =
			await this.prisma.channel.findFirst({
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
			delete joinedChannel.password;
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
	) : Promise<Message[] | string> {
		try {
			await this.isChannel(messageInfo.channelId);
			const isMuted : boolean = await this.isMute(userId, messageInfo.channelId);
			if (isMuted === true)
				throw new Error('You are muted');
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
			return messageObj.messages;
		} catch (err) {
			console.log("err", err);
			if (err)
				return (err.message as string);
			return 'Internal server error: error storing message';
		}
	}

	async leaveChannelWS(
		userId: string,
		channelId: string,
	) : Promise<ChannelUser | string> {
		try {
			if (userId === '' || channelId === '' || userId == null || channelId == null)
				throw new Error('WrongData');
			await this.isChannel(channelId);
			//remove user from channel users
			let leavingUser: ChannelUser = await this.prisma.channelUser.delete({
				where: {
					userId_channelId: {
						userId: userId,
						channelId: channelId,
					},
				},
			});
			const channelUsers: { users: ChannelUser[]} | null =
				await this.prisma.channel.findUnique({
					where: {
						id: channelId,
					},
					select: {
						users: true,
					},
				});
			await this.prisma.channel.update({
				where: {
					id: channelId,
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
						id: channelId,
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
	) : Promise<any> {
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
			const channel: Partial<Channel> | null = await this.prisma.channel.findUnique({
				where: {
					id: dto.channelId,
				},
				select: {
					id: true,
					name: true,
					avatar: true,
					usersCount: true,
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
			const res = {
				channelInvite: channelInvite,
				channel: channel,
			};
			return res;
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
	) : Promise<Channel | string> {
		try {
			//Check if invitation exists
			const invitation: ChannelInvitation | null =
				await this.prisma.channelInvitation.findUnique({
					where: {
						channelId_invitedUserId: {
							channelId: dto.channelId,
							invitedUserId: userId,
						},
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
				return err.message;
			return 'Internal server error: error accepting invitation';
		}
	}

	async declineChanInvitation(
		userId: string,
		dto: InvitationDto,
	): Promise<boolean | string> {
		try {
			//Check if invitation exists
			const invitation: ChannelInvitation | null =
			await this.prisma.channelInvitation.findUnique({
				where: {
					channelId_invitedUserId: {
						channelId: dto.channelId,
						invitedUserId: userId,
					},
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
			console.log("err", err.message);
			return "Internal server error: error declining invitation"
		}
	}

	async updateRole(
		userId: string,
		dto: UpdateRoleDto,
	) : Promise<ChannelUser | string> {
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
	) : Promise<Channel | string> {
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

	async muteUser(
		userId: string,
		dto: ModerateUserDto,
	): Promise<ChannelAction | string> {
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
			const MueDurationInMs: number = 600 * 1000;
			const MuteExpiration: Date = new Date(Date.now() + MueDurationInMs);
			const mutedUser: ChannelAction | null =
			await this.prisma.channelAction.create({
				data: {
					senderId: userId,
					targetId: dto.targetId,
					channelId: dto.channelId,
					channelActionTime: MuteExpiration,
					type: 'MUTE',
				},
			});
			return mutedUser;
		} catch (err) {
			if (err)
				return err.message;
			return 'Internal server error: error muting user';
		}
	}

	async unmuteUser(
		userId: string,
		dto: ModerateUserDto,
	): Promise<ChannelAction | string> {
		try {
			const check = await this.checkIsValideModeration(userId, dto);
			if (check != true)
				throw new Error(check);
			const isMuted: ChannelAction | null = await this.prisma.channelAction.findFirst({
				where: {
					targetId: dto.targetId,
					channelId: dto.channelId,
					type: 'MUTE',
				},
			});
			if (isMuted == null)
				throw new Error('User is not muted');
			const unmutedUser: ChannelAction | null =
			await this.prisma.channelAction.delete({
				where: {
					id: isMuted.id,
				},
			});
			return unmutedUser;
		} catch (err) {
			if (err)
				return err.message;
			return 'Internal server error: error unmuting user';
		}
	}

	async banUser(
		userId: string,
		dto: ModerateUserDto,
	): Promise<ChannelAction | string> {
		try {
			const check = await this.checkIsValideModeration(userId, dto);
			if (check != true)
				throw new Error(check);
			const isBanned: ChannelAction | null = await this.prisma.channelAction.findFirst({
				where: {
					targetId: dto.targetId,
					channelId: dto.channelId,
					type: 'BAN',
				},
			});
			if (isBanned != null)
				throw new Error('User is already banned');
			const bannedUser: ChannelAction | null =
			await this.prisma.channelAction.create({
				data: {
					senderId: userId,
					targetId: dto.targetId,
					channelId: dto.channelId,
					type: 'BAN',
				},
			});
			await this.prisma.channelUser.delete({
				where: {
					userId_channelId: {
						userId: dto.targetId,
						channelId: dto.channelId,
					},
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
			return bannedUser;
		} catch (err) {
			if (err)
				return err.message;
			return 'Internal server error: error banning user';
		}
	}

	async unbanUser(
		userId: string,
		dto: ModerateUserDto,
	): Promise<ChannelAction | string> {
		try {
			const check = await this.checkIsValideModeration(userId, dto);
			if (check != true)
				throw new Error(check);
			const isBanned: ChannelAction | null = await this.prisma.channelAction.findFirst({
				where: {
					targetId: dto.targetId,
					channelId: dto.channelId,
					type: 'BAN',
				},
			});
			if (isBanned == null)
				throw new Error('User is not banned');
			const unbannedUser: ChannelAction | null =
			await this.prisma.channelAction.delete({
				where: {
					id: isBanned.id,
				},
			});
			return unbannedUser;
		} catch (err) {
			if (err)
				return err.message;
			return 'Internal server error: error unbanning user';
		}
	}

	async blockUser(
		userId: string,
		blockedUserId: string,
	): Promise<blockedUser | string> {
		try {
			const isBlocked: blockedUser | null = await this.prisma.blockedUser.findFirst({
				where: {
					userId: userId,
					blockedId: blockedUserId,
				},
			});
			if (isBlocked != null)
				throw new Error('User is already blocked');
			const blockedUser: blockedUser | null =
			await this.prisma.blockedUser.create({
				data: {
					userId: userId,
					blockedId: blockedUserId,
				},
			});
			return blockedUser;
		} catch (err) {
			if (err)
				return err.message;
			return 'Internal server error: error blocking user';
		}
	}

	async unblockUser(
		userId: string,
		blockedUserId: string,
	): Promise<blockedUser | string> {
		try {
			const isBlocked: blockedUser | null = await this.prisma.blockedUser.findFirst({
				where: {
					userId: userId,
					blockedId: blockedUserId,
				},
			});
			if (isBlocked == null)
				throw new Error('User is not blocked');
			const unblockedUser: blockedUser | null =
			await this.prisma.blockedUser.delete({
				where: {
					id: isBlocked.id,
				},
			});
			return unblockedUser;
		} catch (err) {
			if (err)
				return err.message;
			return 'Internal server error: error unblocking user';
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

	async checkIsValideModeration(
		userId: string,
		moderateInfo: ModerateUserDto,
	): Promise<any> {
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

	async isMute(
		userId: string,
		channelId: string,
	): Promise<boolean>{
		const isMuted: ChannelAction | null = await this.prisma.channelAction.findFirst({
			where: {
				targetId: userId,
				channelId: channelId,
				type: 'MUTE',
			},
		});
		if (isMuted != null && isMuted.channelActionTime <= new Date(Date.now()))
		{
			await this.prisma.channelAction.delete({
				where: {
					id: isMuted.id,
				},
			});
			return false;
		}

		if (isMuted != null)
			return true;
		return false;
	}

	async isBanned(
		userId: string,
		channelId: string,
	): Promise<boolean> {
		const isBanned: ChannelAction | null = await this.prisma.channelAction.findFirst({
			where: {
				targetId: userId,
				channelId: channelId,
				type: 'BAN',
			},
		});
		if (isBanned != null)
			return true;
		return false;
	}

	async isBlocked(
		userId: string,
		blockedUserId: string,
	): Promise<boolean> {
		const isBlocked: blockedUser | null = await this.prisma.blockedUser.findFirst({
			where: {
				userId: userId,
				blockedId: blockedUserId,
			},
		});
		if (isBlocked != null)
			return true;
		return false;
	}
}