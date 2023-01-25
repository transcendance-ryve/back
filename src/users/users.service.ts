import { BadRequestException, ConflictException, ConsoleLogger, ForbiddenException, HttpException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Prisma, User, InviteStatus, Blocked } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import { join } from 'path';

@Injectable()
export class UsersService {
    constructor(
        private readonly _prismaService: PrismaService,
    ) {}

    private _experienceGain: number = 10;
    private _nextLevelPourcentage: number = 2;
    private _rankPointGain: number = 10;

    async setAvatar(
        id: Prisma.UserWhereUniqueInput['id'],
        avatar: Express.Multer.File
    ) : Promise<Partial<User>> {
        try {
            if (!avatar)
                throw new NotFoundException('Avatar not found');

			const staticPath = "http://localhost:3000/avatars/";

			const user: User = await this._prismaService.user.findUnique({ where: { id } });
			if (user.avatar !== `${staticPath}default.png`)
				fs.unlinkSync(join(process.cwd(), 'data/avatars/', user.avatar.split('/').pop()));

            return this.updateUser(
                { id },
                { avatar: `${staticPath}${avatar.filename}` }
            );
        } catch(err) {
			if (err instanceof PrismaClientKnownRequestError)
				if (err.code === "P2021")
					throw new NotFoundException("User not found");
            if (err instanceof NotFoundException)
                throw err;
            throw new InternalServerErrorException('Internal server error');
        }
    }

    async addExperience(
        id: Prisma.UserWhereUniqueInput['id'],
        point: number
    ) : Promise<Partial<User>> {
        try {
            const user: Partial<User> = await this.getUser({ id });

            if (!user)
                throw new NotFoundException('User not found');

            const newExperience: number = user.experience + (this._experienceGain * point);

            if (newExperience >= user.next_level) {
                return this.updateUser({ id },
                    {
                        experience: newExperience - user.next_level,
                        level: { increment: 1 },
                        next_level: { multiply: this._nextLevelPourcentage }
                    }
                );
            } else {
                return this.updateUser({ id },
                    { experience: newExperience }
                );
            }
        } catch(err) {
            if (err instanceof NotFoundException)
                throw err;
            throw new InternalServerErrorException('Internal server error');
        }
    }

    async addRankPoint(
        id: Prisma.UserWhereUniqueInput['id'],
        winner: boolean
    ) : Promise<Partial<User>> {
        try {
            const point = winner ? this._rankPointGain : -this._rankPointGain;

            return this.updateUser(
                { id },
                { rank_point: { increment: point } }
            );
        } catch(err) {
            if (err instanceof NotFoundException)
                throw err;
            throw new InternalServerErrorException('Internal server error');
        }
    }

	async blockUser(
		id: Prisma.UserWhereUniqueInput['id'],
		target: Prisma.UserWhereUniqueInput['id']
	) : Promise<{sender: Partial<User>, receiver: Partial<User>}> {
		try {

			const user: Partial<User> = await this.getUser({ id }, "id,username,avatar,status");
			if (!user)
				throw new NotFoundException('User not found');
			
			const targetUser: Partial<User> = await this.getUser({ id: target }, "id,username,avatar,status");
			if (!targetUser)
				throw new NotFoundException('Target user not found');

			await this._prismaService.blocked.create({
				data: {
					user: { connect: { id } },
					blocked: { connect: { id: target } }
				}
			});
	
			return { sender: user, receiver: targetUser };
		} catch(err) {
			if (err instanceof NotFoundException)
				throw err;
			throw new InternalServerErrorException('Internal server error');
		}
	}

	async unblockUser(
		id: Prisma.UserWhereUniqueInput['id'],
		target: Prisma.UserWhereUniqueInput['id']
	) : Promise<{sender: Partial<User>, receiver: Partial<User>}> {
		try {
			const blocked: {user: Partial<User>, blocked: Partial<User>} = await this._prismaService.blocked.delete({
				where: {
					user_id_blocked_id: {
						user_id: id,
						blocked_id: target
					}
				},
				select: {
					user: {
						select: { id: true, username: true, avatar: true }
					},
					blocked: {
						select: { id: true, username: true, avatar: true }
					}
				}
			});

			return { sender: blocked.user, receiver: blocked.blocked };
		} catch(err) {
			if (err instanceof PrismaClientKnownRequestError)
				if (err.code === 'P2025')
					throw new NotFoundException('User not found');
			if (err instanceof NotFoundException)
				throw err;
			throw new InternalServerErrorException('Internal server error');
		}
	}		

    /* FRIENDSHIP */

    async sendFriendRequest(
        senderID: Prisma.UserWhereUniqueInput['id'],
        receiverID: Prisma.UserWhereUniqueInput['id']
    ) : Promise<{sender: Partial<User>, receiver: Partial<User>}> {
        try {
			if (senderID === receiverID)
				throw new BadRequestException('You can\'t send a friend request to yourself');

			const friend = await this.getUser({ id: receiverID }, "id,username,avatar,status");
			if (!friend)
				throw new NotFoundException('User not found');

			const blocked: (Blocked | null) = await this._prismaService.blocked.findFirst({
				where: {
					OR: [
						{ user_id: senderID, blocked_id: receiverID },
						{ user_id: receiverID, blocked_id: senderID }
					]
				}
			})
			if (blocked)
				throw new ForbiddenException('You are blocked by this user');

			try {
				const friendship: {sender: Partial<User>, receiver: Partial<User>} = await this._prismaService.friendship.update({
					where: {
						sender_id_receiver_id: {
							sender_id: receiverID,
							receiver_id: senderID
						}
					},
					select : {
						sender: {
							select: { id: true, username: true, avatar: true }
						},
						receiver: {
							select: { id: true, username: true, avatar: true }
						}
					},
					data: { status: InviteStatus.ACCEPTED }
				})

				return friendship;
			} catch(err) {
				const friendship: {sender: Partial<User>, receiver: Partial<User>} = await this._prismaService.friendship.create({
					data: {
						sender: { connect: { id: senderID } },
						receiver: { connect: { id: receiverID } }
					},
					select : {
						sender: {
							select: { id: true, username: true, avatar: true, status: true }
						},
						receiver: {
							select: { id: true, username: true, avatar: true, status: true }
						}
					},
				});

				return friendship;
			}
        } catch(err) {
			if (err instanceof ForbiddenException)
				throw err;
			if (err instanceof NotFoundException)
				throw err;
            if (err instanceof PrismaClientKnownRequestError)
                if (err.code === 'P2002')
                    throw new ConflictException('Friend request already sent');
                    
            throw new InternalServerErrorException('Internal server error');
        }
    }

    async acceptFriendRequest(
        senderID: Prisma.UserWhereUniqueInput['id'],
        receiverID: Prisma.UserWhereUniqueInput['id']
    ) : Promise<{sender: Partial<User>, receiver: Partial<User>}> {
        try {
            const friendship: {sender: Partial<User>, receiver: Partial<User>} = await this._prismaService.friendship.update({
				where: {
					sender_id_receiver_id: {
                        sender_id: receiverID,
                        receiver_id: senderID
                    },
                },
				select: {
					sender: {
						select: { id: true, username: true, avatar: true, status: true }
					},
                    receiver: {
                        select: { id: true, username: true, avatar: true, status: true }
                    }
                },
                data: { status: InviteStatus.ACCEPTED }
            });

            return friendship;
        } catch(err) {
			if (err instanceof PrismaClientKnownRequestError)
				if (err.code === 'P2025')
					throw new NotFoundException('Friend request not found');
            throw new InternalServerErrorException('Internal server error');
        }
    }

    async removeFriendRequest(
        senderID: Prisma.UserWhereUniqueInput['id'],
        receiverID: Prisma.UserWhereUniqueInput['id']
    ) : Promise<{sender: Partial<User>, receiver: Partial<User>}> {
        try {
			const friendship = await this._prismaService.friendship.findFirst({
				where: {
					OR: [
						{
							sender_id: senderID,
							receiver_id: receiverID
						},
						{
							sender_id: receiverID,
							receiver_id: senderID
						}
					]
				},
				select: {
					id: true,
					sender: {
						select: { id: true, username: true, avatar: true, status: true }
					},
					receiver: {
						select: { id: true, username: true, avatar: true, status: true }
					},
					channel_id: true
				}
			});

			if (!friendship)
				throw new NotFoundException('Friend request not found');
			
			if (friendship.channel_id) {
				await this._prismaService.channel.delete({
					where: {
						id: friendship.channel_id
					}
				});
			} else {
				await this._prismaService.friendship.delete({
					where: {
						id: friendship.id
					},
					select: {
						sender: {
							select: { id: true, username: true, avatar: true, status: true }
						},
						receiver: {
							select: { id: true, username: true, avatar: true, status: true }
						},
					},
				});
			}

			let data: { sender: Partial<User>, receiver: Partial<User> } = { sender: null, receiver: null }
			if (senderID === friendship.sender.id) {
				data.sender = friendship.sender;
				data.receiver = friendship.receiver;
			} else {
				data.sender = friendship.receiver;
				data.receiver = friendship.sender;
			}

            return data;
        } catch(err) {
			if (err instanceof PrismaClientKnownRequestError)
				if (err.code === 'P2025')
					throw new NotFoundException('Friend request not found');
			if (err instanceof NotFoundException)
				throw err;
            throw new InternalServerErrorException('Internal server error');
		}
    }

	async updatePassword(
		id: string,
		oldPassword: string,
		newPassword: string
	) : Promise<Partial<User>> {
		try {
			const user = await this._prismaService.user.findUnique({ where: { id } });
			if (!user)
				throw new NotFoundException('User not found');

			const isPasswordCorrect = await bcrypt.compare(oldPassword, user.password);
			if (!isPasswordCorrect)
				throw new ConflictException('Wrong password');

			const hashedPassword = await bcrypt.hash(newPassword, 10);
			return this.updateUser({ id }, { password: hashedPassword });
		} catch(err) {
			if (err instanceof PrismaClientKnownRequestError)
				if (err.code === "P2021")
					throw new NotFoundException("User not found");
			if (err instanceof ConflictException)
				throw err;
			if (err instanceof NotFoundException)
				throw err;
			throw new InternalServerErrorException('Internal server error');
		}
	}

    async getFriends(
        id: Prisma.UserWhereUniqueInput['id'],
    ) : Promise<any> {
        try {
			const blockedUsers = await this._prismaService.user.findUnique({
				where: {
					id
				},
				select: {
					user_blocked: {
						select: {
							user_id: true
						}
					}
				}
			})

            const friends = await this._prismaService.friendship.findMany({
                where: {
					OR: [
						{ sender_id: id },
						{ receiver_id: id }
					],
                    status: InviteStatus.ACCEPTED
                },
                select: {
					sender: {
						select: { id: true, username: true, avatar: true, status: true }
					},
                    receiver: {
						select: { id: true, username: true, avatar: true, status: true }
                    },
					channel: {
						select: { messages: { take: 1, orderBy: { createdAt: 'desc' }, select: { content: true } } }
					}
                },
            })
			
			const friendsList = friends.map(friend => {
				let messages = null;
				if (!blockedUsers?.user_blocked?.find(user => user.user_id === friend?.sender?.id || user.user_id === friend?.receiver?.id))
					messages = friend?.channel?.messages[0] || null;

				if (friend.sender.id === id)
					delete friend.sender;
				else
					delete friend.receiver;

				if (friend.sender) return { ...friend.sender, messages };
				else return { ...friend.receiver, messages };
			})

            return friendsList;
        } catch(err) {
			if (err instanceof PrismaClientKnownRequestError)
				if (err.code === "P2021")
					throw new NotFoundException("User not found");
            throw new InternalServerErrorException('Internal server error'); 
        }
    }

    async getFriendRequests(
        id: Prisma.UserWhereUniqueInput['id']
    ) : Promise<any> {
        try {
            const friends = await this._prismaService.friendship.findMany({
                where: {
                    receiver_id: id,
                    status: InviteStatus.PENDING
                },
                select: {
                    sender: {
                        select: { id: true, username: true, avatar: true, status: true }
                    },
					receiver: {
						select: { id: true, username: true, avatar: true, status: true }
					}
                },
            })

			if (!friends || friends.length <= 0)
				return [];

            return friends.map(friend => friend.sender);
        } catch(err) {
            throw new InternalServerErrorException('Internal server error');
        }
    }

    async createUser(
        data: Prisma.UserCreateInput
    ) : Promise<User> {
        try {
			const user = await this._prismaService.user.create({ data });

			delete user.password;

            return user;
        } catch(err) {
			if (err instanceof PrismaClientKnownRequestError)
				if (err.code === 'P2002')
					throw new ConflictException('User already exist');

			throw new InternalServerErrorException('Internal server error');
        }
    }

	async getUserWithRelationship(
		id: Prisma.UserWhereUniqueInput['id'],
		target: Prisma.UserWhereUniqueInput['id'],
		selected?: string
	) : Promise<{ user: Partial<User>, status: InviteStatus, sender: string }> {
		const select: Prisma.UserSelect = selected?.split(',').reduce((acc, curr) => {
			acc[curr] = true;
			return acc;
		}, {});

        try {
            const user: (Partial<User> | null) = await this._prismaService.user.findUnique({
				where: { id: target },
				select: (selected && selected.length > 0) ? select : undefined
			});

			const friendStatus = await this._prismaService.friendship.findFirst({
				where: {
					OR: [
						{ sender_id: id, receiver_id: target },
						{ sender_id: target, receiver_id: id }
					]
				}
			});

			if (!user)
				throw new NotFoundException('User not found');
			
			delete user.password;
			return { user, status: friendStatus ? friendStatus.status : InviteStatus.NONE, sender: friendStatus?.sender_id || undefined };
        } catch(err) {
			if (err instanceof PrismaClientKnownRequestError)
				if (err.code === "P2021")
					throw new NotFoundException("User not found");
			if (err instanceof NotFoundException)
				throw err;
            throw new InternalServerErrorException("Internal server error");
        }
	}

	async getUsersWithRelationship(
		id: Prisma.UserWhereUniqueInput['id'],
		search?: string,
		selected?: string
	) : Promise<{ users: { user: Partial<User>, status: InviteStatus, sender: string }[], count: number }> {
		const select: Prisma.UserSelect = selected?.split(',').reduce((acc, curr) => {
			acc[curr] = true;
			return acc;
		}, {});

		try {
			const users: Partial<User>[] = await this._prismaService.user.findMany({
				where: {
					AND: [
						{ username: { contains: search, mode: 'insensitive' } },
						{ id: { not: id }}
					]
				},
				select: (selected && selected.length > 0) ? select : undefined
			});

			const count = await this._prismaService.user.count({
				where: {
					username: { contains: search, mode: 'insensitive' },
				}
			});

			const friends = await this._prismaService.friendship.findMany({
				where: {
					OR: [
						{ sender: { id }, receiver: { id: { in: users.map(user => user.id) } } },
						{ sender: { id: { in: users.map(user => user.id) } }, receiver: { id } }
					]
				},
				select: {
					sender: { select: { id: true } },
					receiver: { select: { id: true } },
					status: true
				}
				
			});

			const usersWithRelationship = users.map(user => {
				const friendStatus = friends.find(friend => {
					if (friend.sender.id === user.id)
						return friend.receiver.id === id;
					else
						return friend.sender.id === id;
				});

				delete user.password;
				return { user, status: (friendStatus ? friendStatus.status : InviteStatus.NONE), sender: (friendStatus?.sender.id || undefined) };
			});

			return { users: usersWithRelationship, count: (count - 1) };
		} catch(err) {
			throw new InternalServerErrorException('Internal server error');
		}
	}

    async getUser(
		where: Prisma.UserWhereUniqueInput,
		selected?: string,
    ) : Promise<Partial<User> | null> {
		const select: Prisma.UserSelect = selected?.split(',').reduce((acc, curr) => {
			acc[curr] = true;
			return acc;
		}, {});

        try {
            const user: (Partial<User> | null) = await this._prismaService.user.findUnique({
				where,
				select: (selected && selected.length > 0) ? select : undefined
			});

			if (!user) return null;
			
			delete user.password;
			return user;
        } catch(err) {
			if (err instanceof PrismaClientKnownRequestError)
				if (err.code === "P2021")
					return null;
            throw new InternalServerErrorException("Internal server error");
        }
    }

	async getUsers(
		search?: string,
		take?: number,
		page?: number,
		sort?: string,
		order?: string,
		skip?: number,
		selected?: string,
	) : Promise<{ users: Partial<User>[], count: number }> {
		try {
			const select: Prisma.UserSelect = selected?.split(',').reduce((acc, curr) => {
				acc[curr] = true;
				return acc;
			}, {});

			const users: Partial<User>[] = await this._prismaService.user.findMany({
				where: {
					username: { contains: search, mode: 'insensitive' }
				},
				skip: skip || (page - 1) * take || undefined,
				take: take || 12,
				orderBy: { [sort || "username"]: order === 'asc' ? 'asc' : 'desc' },
				select: (selected && selected.length > 0) ? select : undefined
			});

			users.map(user => delete user.password);

			const count = await this._prismaService.user.count({
				where: { username: { contains: search, mode: 'insensitive' } }
			});

			return { users, count };
		} catch(err) {
			if (err instanceof PrismaClientKnownRequestError) {
				if (err.code === 'P2025')
					throw new NotFoundException('User not found');
			}
			throw new InternalServerErrorException("Internal server error");
		}
	}

    async updateUser(
        where: Prisma.UserWhereUniqueInput,
        data: Prisma.UserUpdateInput
    ) : Promise<Partial<User>> {
        try {
            const user = await this._prismaService.user.update({ where, data });
			delete user.password;

            return user;
        } catch(err) {
			if (err instanceof PrismaClientKnownRequestError) {
				if (err.code === 'P2002')
					throw new ConflictException('username already taken');
				if (err.code === 'P2025')
					throw new NotFoundException('User not found');
			}

            throw new InternalServerErrorException("Internal server error");
        }
    }

    async deleteUser(id: Prisma.UserWhereUniqueInput['id']) : Promise<User> {
        try {
            const user: User = await this._prismaService.user.delete({ where: { id } });
			delete user.password;

            return user;
        } catch(err) {
            if (err instanceof PrismaClientKnownRequestError)
                if (err.code === 'P2025')
                    throw new NotFoundException('User not found');

            throw new InternalServerErrorException('Internal server error');
        }
    }
}
