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
	Friendship,
} from '@prisma/client';
import {
	CreateChannelDto,
	DirectMessageDto,
	IncomingMessageDto,
	JoinChannelDto,
	InviteToChannelDto,
	InvitationDto,
	UpdateRoleDto,
	EditChannelDto,
	ModerateUserDto,
} from './dto';
import { Socket, Server } from 'socket.io';
import { UserIdToSockets } from 'src/users/userIdToSockets.service';
import { join } from 'path';
import { UserTag, InvitaionTag } from './interfaces/utils.interfaces';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import { Prisma } from '@prisma/client';




@Injectable()
export class ChannelService {
	constructor(
		private readonly prisma: PrismaService
		) {}

	private staticPath: string = 'http://localhost:3000/';
	//Getter

	//@brief: Get all the channels of a user except
	//the private ones and the ones the user is already in
	//@Param: name: string
	//@param: userId: string
	//@return: Promise<Channel[]>
	getChannels(
		name: string,
		userId: string,
	) : Promise<Channel[]> {
		if (!name)
			return;
		return this.prisma.channel.findMany({
			where: {
				NOT: {
					OR:[
						{ status: 'PRIVATE',}, 
						{ users: {
							some: { userId: userId, },
							},
						},
					],
				},
				name: {
					contains: name,
					mode: 'insensitive',
				},
			},
		});
	}

	//@brief: Get all the channels of a user
	//@param: userId: string
	//@return: Promise<Channel[]>
	async getChannelById(
		where: Prisma.ChannelWhereUniqueInput,
		selected?: string,
		) : Promise<Partial<Channel> | null>
		{
			const select: Prisma.ChannelSelect = selected?.split(',').reduce((acc, cur) => {
				acc[cur] = true;
				return acc;
			}, {});

			try {
				const channel: Partial<Channel> | null = await this.prisma.channel.findUnique({
					where,
					select: (selected && selected.length > 0) ? select : undefined,
				});

				if (!channel)
					throw new Error('Channel not found');
				
				delete channel.password;
				return channel;
			} catch (err) {
				if (err)
					throw new Error(err.message);
				throw new Error("Internal server error")
			}
		}

	//@brief: Get all the messages of a channel
	//@param: channelId: string
	//@return: Promise<Message[]>
	async getMessagesOfChannel(
		channelId: string,
		page: number,
		take: number,
		): Promise<any> {
		try {
			await this.isChannel(channelId);
			const messages: Message[] = await this.prisma.channel
			.findUnique({
				where: {
					id: channelId,
				},
			})
			.messages();
			if (take > messages.length)
				take = messages.length;
			if (messages.length == 0)
			{
				const res: any = [];
				return { res, total: 0 };
			}
			page = (messages.length / take) - page;
			let res : any = [];
			for (let i = (page - 1) * take; i < page * take; i++) {
				i = Math.round(i);
				if (i < 0)
					i = 0;
				res.push({
					content: messages[i].content,
					createdAt: messages[i].createdAt,
					sender: await this.prisma.user.findFirst({
							where: {
								id: messages[i].senderId,
							},
							select: {
								id: true,
								username: true,
								avatar: true,
							},
						}),
				});
			}
			const total: number = messages.length;
			return { res, total };
		} catch (error) {
			return error;
		}
	}

	//@brief: Get all the channels of a user
	//@param: userId: string
	//@return: Promise<Channel[]>
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

	//@brief: Get all the users of a channel
	//@param: channelId: string
	//@return: Promise<UserTag[]>
	async getUsersOfChannel(channelId: string):
	Promise<UserTag[]>
	{
		try {
			await this.isChannel(channelId);
			const users: any[] = await this.prisma.channelUser.findMany({
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
			const res: UserTag[] = [];
			for (const user of users) {
				res.push({
					id: user.user.id,
					username: user.user.username,
					avatar: user.user.avatar,
					role: user.role,
					isMute: await this.isMute(user.user.id, channelId),
					isBan: await this.isBanned(user.user.id, channelId),
				});
			}
			return res;
		} catch (error) {
			return error;
		}
	}

	//@brief: Get some information of a user in a channel
	//@param: channelId: string, userId: string
	//@return: Promise<UserTag | string>
	async getUserTag(channelId: string, userId: string):
	Promise<UserTag | string>
	{
		try{
		await this.isChannel(channelId);
			const user: any = await this.prisma.channelUser.findFirst({
				where: {
					channelId: channelId,
					userId: userId,
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
			if (!user) {
				return 'User not found';
			}
			const res: UserTag = {
				id: user.user.id,
				username: user.user.username,
				avatar: user.user.avatar,
				role: user.role,
				isMute: await this.isMute(user.user.id, channelId),
				isBan: await this.isBanned(user.user.id, channelId),
				};
			return res;
		} catch (error) {
			return error.message;
		}
	}

	//@brief: Get all the users invited in a channel
	//@param: channelId: string
	//@return: Promise<UserTag[]>
	async getPendingUserTag(userId: string):
	Promise<UserTag | string>
	{
		try {
			const user: any = await this.prisma.user.findFirst({
				where: {
					id: userId,
				},
				select: {
					id: true,
					username: true,
					avatar: true,
				},
			});
			if (!user) {
				throw new Error('User not found');
			}
			const res: UserTag = {
				id: user.id,
				username: user.username,
				avatar: user.avatar,
				role: null,
				isMute: false,
				isBan: false,
			};
			return res;
		} catch (error) {
			return error.message;
		}
	}

	//@brief: Get some information on the channels the user is invited in
	//@param: userId: string
	//@return: Promise<any>
	async getChannelInvitesByUser(userId: string):
	Promise<InvitaionTag[] | string>
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
			let res: InvitaionTag[] =  invites.map((invite) => invite.channel);
			return res;
		} catch (err) {
			return(err).message;
		}
	}

	//@brief: Get the list of muted users in a channel
	//@param: channelId: string
	//@return: Promise<any>
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

	//@brief: Get the list of banned users in a channel
	//@param: channelId: string
	//@return: Promise<any>
	async getBannedUsersOfChannel(channelId: string):
	Promise<any>{
		try {
			await this.isChannel(channelId);
			const users: {
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
			const res: UserTag[] = [];
			for (const user of users) {
				res.push({
					id: user.target.id,
					username: user.target.username,
					avatar: user.target.avatar,
					role: null,
					isMute: await this.isMute(user.target.id, channelId),
					isBan: await this.isBanned(user.target.id, channelId),
				});
			}
			return res;
		} catch (error) {
			return error.message;
		}
	}

	//@brief: Get the role of a user in a channel
	//@param: userId: string
	//@param: channelId: string
	//@return: Promise<string>
	async getRole(userId: string, channelId: string):
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

	//@brief: Get the list of pending invites in a channel
	//@param: channelId: string
	//@return: Promise<any>
	async getPendingInvitesOfChannel(channelId: string):
	Promise<any>{
		try {
			const users = await this.prisma.channelInvitation.findMany({
				where: {
					channelId: channelId,
				},
				select: {
					invitedUser: {
						select: {
							id: true,
							username: true,
							avatar: true,
						},
					},
				},
			});
			const res: UserTag[] = [];
			for (const user of users) {
				res.push({
					id: user.invitedUser.id,
					username: user.invitedUser.username,
					avatar: user.invitedUser.avatar,
					role: null,
					isMute: await this.isMute(user.invitedUser.id, channelId),
					isBan: await this.isBanned(user.invitedUser.id, channelId),
				});
			}
			return res;
		} catch (error) {
			return error.message;
		}
	}

	//Actions

	//@brief: Connect a user to all the channels he is in
	//@param: userId: string
	//@param: clientSocket: Socket
	//@return: Promise<void>
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

	//@brief: Create a channel
	//@param: dto: CreateChannelDto
	//@param: userId: string
	//@param: clientSocket: Socket
	//@param: avatar: Express.Multer.File
	//@param: _server: Server
	//@return: Promise<Channel | string>
	async createChannelWS(
		dto: CreateChannelDto,
		userId: string,
		clientSocket: Socket,
		avatar: Express.Multer.File,
		_server: Server,
	) : Promise<Channel | string>{
		//throw error if channel name is empty
		try {
			if (!dto.name || dto.name === '')
				throw new Error('Channel name is required');
			if (dto.status === 'PROTECTED' && !dto.password)
				throw new Error('Password is required');
			if (dto.status === 'PROTECTED' && dto.password.length > 0) {
				dto.password = await bcrypt.hash(dto.password, 10);
			}
			//try to create channel
			const createdChannel: Channel = await this.prisma.channel.create({
				data: {
					...dto,
					avatar: avatar ? this.staticPath + avatar.filename : this.staticPath + 'default.png',
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
					//invite users to channel
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

	//@brief: Create a direct message channel
	//@param: userId: string
	//@param: dto: DirectMessageDto
	//@param: clientSocket: Socket
	//@return: Promise<Channel | string>
	async createDMChannelWS(
		userId: string,
		dto: DirectMessageDto,
		clientSocket: Socket,
	) : Promise<Channel | string> {
		try {
			//check if dm channel already exists
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
			//create new dm channel
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
			//update friendship
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
					channel: {
						connect: {
							id: newDMChannel.id,
						},
					},
				},
			});
			//join the users sockets to the channel
			await clientSocket.join(newDMChannel.id);
			const friendSocket = UserIdToSockets.get(dto.friendId);
			if (friendSocket) {
				await friendSocket.join(newDMChannel.id);
			}
			return newDMChannel;
		} catch (err) {
			console.log(err);
			if (err.code === 'P2002')
				return 'Channel name already used';
			else if(err)
				return err.message;
			return 'Internal server error: error creating channel';
		}
	}

	//@brief: Join a channel
	//@param: channelDto: JoinChannelDto
	//@param: userId: string
	//@param: clientSocket: Socket
	//@return: Promise<Channel | string>
	async joinChannelWs(
		channelDto: JoinChannelDto,
		userId: string,
		clientSocket: Socket,
	) : Promise<Channel | string> {
		try {
			const isBanned: boolean = await this.isBanned(userId, channelDto.channelId);
			if (isBanned)
				throw new Error('You are banned from this channel');
			//Check if user is invited on private channels
			if (channelDto.status === 'PRIVATE') {
				const isInvited: ChannelInvitation | null = await this.prisma.channelInvitation.findFirst({
					where: {
						invitedUserId: userId,
					},
				});
				if (isInvited == null)
					throw new Error('Not invited in private channel');
				await this.prisma.channelInvitation.delete({
					where: {
						id: isInvited.id,
					},
				});
			}// check if user have the good password for protected channels
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
						throw new Error('Wrong password');
				}
			}
			//Check if channel exists
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
			//delete the invitation if the user is invited
			const isInvited: ChannelInvitation | null = await this.prisma.channelInvitation.findFirst({
				where: {
					invitedUserId: userId,
					channelId: channelDto.channelId,
				},
			});
			if (isInvited != null) {
				await this.prisma.channelInvitation.delete({
					where: {
						id: isInvited.id,
					},
				});
			}
			return joinedChannel;
		} catch (err) {
			console.log("err", err);
			if (err.message === "data and hash must be strings")
				return "Wrong password";
			if (err)
				return (err.message);
			return 'Internal server error: error joining channel';
		}
	}

	//@brief: save a message in a channel
	//@param: userId: string
	//@param: messageInfo: IncomingMessageDto
	//@return: Promise<Message[] | string>
	async saveMessage(
		userId: string,
		messageInfo: IncomingMessageDto,
	) {
		try {
			//check if channel exists
			await this.isChannel(messageInfo.channelId); 
			//check if user is muted
			const isMuted : boolean = await this.isMute(userId, messageInfo.channelId);
			if (isMuted === true)
				throw new Error('You are muted');
			//save the message
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
				const message: Message = messageObj.messages[messageObj.messages.length - 1];
				const res = {
					content: message.content,
					createdAt: message.createdAt,
					sender:  await this.prisma.user.findFirst({
						where: {
							id: message.senderId,
						},
						select: {
							id: true,
							username: true,
							avatar: true,
						},
					}),
				}
			return res;

		} catch (err) {
			console.log("err", err);
			if (err)
				return (err.message as string);
			return 'Internal server error: error storing message';
		}
	}

	//@brief: leave a channel
	//@param: userId: string
	//@param: channelId: string
	//@return: Promise<ChannelUser | string>
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
			await this.prisma.channel.update({
				where: {
					id: channelId,
				},
				data: {
					usersCount: {
						decrement: 1,
					},
				},
				select: {
					users: true,
				},
			});
			//delete channel if no users left
			if (channelUsers.users.length == 0) {
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

	//@brief: invite a user to a channel
	//@param: userId: string
	//@param: dto: InviteToChannelDto
	//@return: Promise<any>
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
			//Create channel invitation
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

	//@brief: accept a channel invitation
	//@param: userId: string
	//@param: dto: InvitationDto
	//@param: clientSocket: Socket
	//@return: Promise<Channel | string>
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

	//@brief: decline a channel invitation
	//@param: userId: string
	//@param: dto: InvitationDto
	//@return: Promise<boolean | string>
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

	//@brief: promote a user to admin
	//@param: userId: string
	//@param: dto: UpdateRoleDto
	//@return: Promise<ChannelUser | string>
	async promoteUser(
		userId: string,
		dto: UpdateRoleDto,
	) : Promise<ChannelUser | string> {
		try {
			//Check if sender exists
			const senderRole: string | null = 
			await this.getRole(userId, dto.channelId);
			if (senderRole === 'MEMBER')
				throw new Error('User dont have permission to update role');
			//Check if target exists and is not owner or admin
			const targetRole: string | null =
			await this.getRole(dto.userId, dto.channelId);
			if (targetRole === 'OWNER' || targetRole === 'ADMIN')
				throw new Error('User is owner or admin');
			//Update role
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
			//Unmute user if muted
			const isMute =
			await this.prisma.channelAction.findFirst({
				where: {
						targetId: dto.userId,
						channelId: dto.channelId,
				},
			});
			if (isMute != null)
				await this.prisma.channelAction.delete({
					where: {
						id: isMute.id,
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

	//@brief: demote a user to member
	//@param: userId: string
	//@param: dto: UpdateRoleDto
	//@return: Promise<ChannelUser | string>
	async demoteUser(
		userId: string,
		dto: UpdateRoleDto,
	) : Promise<ChannelUser | string> {
		try {
			//Check if user exists
			const senderRole: string | null = 
			await this.getRole(userId, dto.channelId);
			if (senderRole !== 'OWNER')
				throw new Error('User dont have permission to demote user');
			//Check if user exists and is not owner or admin
			const targetRole: string | null =
			await this.getRole(dto.userId, dto.channelId);
			if (targetRole === 'OWNER')
				throw new Error('Cannot demote owner');
			//Update role
			const updatedChannelUser: ChannelUser | null =
			await this.prisma.channelUser.update({
				where: {
					userId_channelId: {
						userId: dto.userId,
						channelId: dto.channelId,
					},
				},
				data: {
					role: "MEMBER",
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

	//@brief: edit a channel
	//@param: userId: string
	//@param: dto: EditChannelDto
	//@param: avatar: Express.Multer.File
	//@return: Promise<Channel | string>
	async editChannel(
		userId: string,
		dto: EditChannelDto,
		avatar: Express.Multer.File,
	) : Promise<Channel | string> {
		try {
			//Check if sender have the right to edit channel
			const senderRole: string | null =
			await this.getRole(userId, dto.channelId);
			if (senderRole === 'MEMBER')
				throw new Error('User dont have permission to edit channel');
			//Check if password is provided if new channel is protected
			if (dto.status === 'PROTECTED')
			{
				if (dto.password == null)
					throw new Error('Password is required');
				dto.password = await bcrypt.hash(dto.password, 10);
			}
			else if (dto.status === 'PUBLIC' || dto.status === 'PRIVATE')
				dto.password = null;

			const chan: Channel | null =
			await this.prisma.channel.findUnique({
				where: {
					id: dto.channelId,
				},
			});
			//Delete old avatar if new one is provided
			if (avatar)
			{
				if (chan.avatar !== `${this.staticPath}default.png`)
					fs.unlinkSync(join(process.cwd(), 'data/avatars/', chan.avatar.split('/').pop()));
			}
			let tmp: string = chan.avatar;
			//Update channel
			const updatedChannel: Channel | null =
			await this.prisma.channel.update({
				where: {
					id: dto.channelId,
				},
				data: {
					name: dto.name,
					status: dto.status,
					password: dto.password,
					avatar: avatar ? this.staticPath + avatar.filename : tmp,
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

	//@brief: Mute a user of a channel
	//@param: userId: string
	//@param: dto: ModerateUserDto
	//@param: _server: Server
	//@return: Promise<ChannelAction | string>
	async muteUser(
		userId: string,
		dto: ModerateUserDto,
		_server: Server,
	): Promise<ChannelAction | string> {
		try {
			//Check if user have permission to mute user and if target is not a admin or owner
			const check = await this.checkIsValideModeration(userId, dto);
			if (check != true)
				throw new Error(check);
			//Check if user is already muted
			const isMuted: ChannelAction | null = await this.prisma.channelAction.findFirst({
				where: {
					targetId: dto.targetId,
					type: 'MUTE',
				},
			});
			if (isMuted != null)
				throw new Error('User is already muted');
			//Set mute duration
			const MueDurationInMs: number = 10 * 1000; //10s
			const MuteExpiration: Date = new Date(Date.now() + MueDurationInMs);
			//Create mute action
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
			//Unmute user after the mute duration
			setTimeout(async () => {
				const mutedUser: ChannelAction | null =
				await this.prisma.channelAction.findFirst({
					where: {
						targetId: dto.targetId,
						type: 'MUTE',
					},
				});
				if (mutedUser !== null)
					await this.prisma.channelAction.delete({
						where: {
							id: mutedUser.id,
						},
					});
				_server.to(dto.channelId).emit('userUnmuted', dto.targetId);
			}, MueDurationInMs);
			return mutedUser;
		} catch (err) {
			if (err)
				return err.message;
			return 'Internal server error: error muting user';
		}
	}

	//@brief: Unmute a user of a channel
	//@param: userId: string
	//@param: dto: ModerateUserDto
	//@return: Promise<ChannelAction | string>
	async unmuteUser(
		userId: string,
		dto: ModerateUserDto,
	): Promise<ChannelAction | string> {
		try {
			//Check if user have permission to mute user and if target is not a admin or owner
			const check = await this.checkIsValideModeration(userId, dto);
			if (check != true)
				throw new Error(check);
			//Check if user is muted
			const isMuted: ChannelAction | null = await this.prisma.channelAction.findFirst({
				where: {
					targetId: dto.targetId,
					channelId: dto.channelId,
					type: 'MUTE',
				},
			});
			if (isMuted == null)
				throw new Error('User is not muted');
			//Unmute user
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

	//@brief: Ban a user of a channel
	//@param: userId: string
	//@param: dto: ModerateUserDto
	//@return: Promise<ChannelAction | string>
	async banUser(
		userId: string,
		dto: ModerateUserDto,
	): Promise<UserTag | string> {
		try {
			//Check if user have permission to mute user and if target is not a admin or owner
			const check = await this.checkIsValideModeration(userId, dto);
			if (check != true)
				throw new Error(check);
			//Check if user is already banned
			const isBanned: ChannelAction | null = await this.prisma.channelAction.findFirst({
				where: {
					targetId: dto.targetId,
					channelId: dto.channelId,
					type: 'BAN',
				},
			});
			if (isBanned != null)
				throw new Error('User is already banned');
			//Create ban action
			const bannedUser: ChannelAction | null =
			await this.prisma.channelAction.create({
				data: {
					senderId: userId,
					targetId: dto.targetId,
					channelId: dto.channelId,
					type: 'BAN',
				},
			});
			//Get user tag to return
			const user: UserTag | string = await this.getUserTag(dto.channelId, dto.targetId);
			//Remove user from channel
			await this.prisma.channelUser.delete({
				where: {
					userId_channelId: {
						userId: dto.targetId,
						channelId: dto.channelId,
					},
				},
			});
			//Decrement channel users count
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
			return user;
		} catch (err) {
			if (err)
				return err.message;
			return 'Internal server error: error banning user';
		}
	}

	//@brief: Unban a user of a channel
	//@param: userId: string
	//@param: dto: ModerateUserDto
	//@return: Promise<ChannelAction | string>
	async unbanUser(
		userId: string,
		dto: ModerateUserDto,
	): Promise<ChannelAction | string> {
		try {
			//Check if user have permission to mute user and if target is not a admin or owner
			const check = await this.checkIsValideModeration(userId, dto);
			if (check != true)
				throw new Error(check);
			//Check if user is banned
			const isBanned: ChannelAction | null = await this.prisma.channelAction.findFirst({
				where: {
					targetId: dto.targetId,
					channelId: dto.channelId,
					type: 'BAN',
				},
			});
			if (isBanned == null)
				throw new Error('User is not banned');
			//Unban user
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

	// utils
	//@brief: Check if channel exist
	//@param: channelId: string
	async isChannel(channelId: string) {
		const channel: Channel | null = await this.prisma.channel.findUnique({
			where: {
				id: channelId,
			},
		});
		if (channel == null)
			throw new Error('Channel not found');
	}

	//@brief: Check if user have permission to moderate, 
	//if target is not admin or owner, if channel exist and if channel is not a DM
	//@param: userId: string
	//@param: moderateInfo: ModerateUserDto
	//@return: Promise<boolean | string>
	async checkIsValideModeration(
		userId: string,
		moderateInfo: ModerateUserDto,
	): Promise<any> {
		try {
			const senderRole: string | null =
			await this.getRole(userId, moderateInfo.channelId);
			if (senderRole != 'OWNER' && senderRole != 'ADMIN')
				throw new Error('User dont have permission to moderate');
			const targetRole: string | null =
			await this.getRole(moderateInfo.targetId, moderateInfo.channelId);
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

	//@brief: Check if user is muted
	//@param: userId: string
	//@param: channelId: string
	//@return: Promise<boolean>
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
		if (isMuted != null)
			return true;
		return false;
	}

	//@brief: Check if user is banned
	//@param: userId: string
	//@param: channelId: string
	//@return: Promise<boolean>
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
}