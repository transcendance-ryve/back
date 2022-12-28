import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Prisma, User, Friendship } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { LeaderboardDto } from './dto/leaderboard-dto';
import { send } from 'process';

@Injectable()
export class UsersService {
    constructor(
        private readonly _prismaService: PrismaService
    ) {}

    private _experienceGain: number = 10;
    private _nextLevelPourcentage: number = 2;
    private _rankPointGain: number = 10;

	async getProfile(
		id : Prisma.UserWhereUniqueInput['id'],
		target: Prisma.UserWhereUniqueInput['id']
	) : Promise<{user: User, isFriend: boolean}> {
		try {
			const user = await this.getUser({ id: target });
			if (!user)
				throw new NotFoundException('User not found');
			
			const friendStatus = await this._prismaService.friendship.findFirst({
				where: {
					OR: [
						{ AND: [{ senderId: id }, { receiverId: target }] },
						{ AND: [{ senderId: target }, { receiverId: id }] }
					],
				},
				select: {
					accepted: true
				}
			});

			return {
				user,
				isFriend: friendStatus ? friendStatus.accepted : false
			}
		} catch(err) {
			if (err instanceof NotFoundException)
				throw err;
			throw new InternalServerErrorException('Internal server error');
		}
	}

    async getAvatar(
        id: Prisma.UserWhereUniqueInput['id']
    ) : Promise<string> {
        try {
            const user: User = await this._prismaService.user.findUnique({ where: { id } })

            if (!user)
                throw new NotFoundException('User not found');

            return user.avatar;
        } catch(err) {
            if (err instanceof NotFoundException)
				throw err;
            throw new InternalServerErrorException('Internal server error');
        }
    }

    async setAvatar(
        id: Prisma.UserWhereUniqueInput['id'],
        avatar: Express.Multer.File
    ) : Promise<User> {
        try {
            if (!avatar)
                throw new NotFoundException('Avatar not found');

			const staticPath = "http://localhost:3000/";
            const user: (User | null) = await this._prismaService.user.update({
                where: { id },
                data: { avatar: `${staticPath}${avatar.filename}` }
            });

            return user;
        } catch(err) {
			console.log(err);
            if (err instanceof NotFoundException)
                throw err;
            throw new InternalServerErrorException('Internal server error');
        }
    }

    async addExperience(
        id: Prisma.UserWhereUniqueInput['id'],
        point: number
    ) : Promise<User> {
        try {
            const user: User = await this._prismaService.user.findUnique({ where: { id } });

            if (!user)
                throw new NotFoundException('User not found');

            const newExperience: number = user.experience + (this._experienceGain * point);

            if (newExperience >= user.nextLevel) {
                return this._prismaService.user.update({
                    where: { id },
                    data: {
                        experience: newExperience - user.nextLevel,
                        level: { increment: 1 },
                        nextLevel: { multiply: this._nextLevelPourcentage }
                    }
                });
            } else {
                return this._prismaService.user.update({
                    where: { id },
                    data: { experience: newExperience }
                });
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
    ) : Promise<User> {
        try {
            const point = winner ? this._rankPointGain : -this._rankPointGain;

            return this._prismaService.user.update({
                where: { id },
                data: { rankPoint: { increment: point } }
            });
        } catch(err) {
            if (err instanceof NotFoundException)
                throw err;
            throw new InternalServerErrorException('Internal server error');
        }
    }

    /* LEADERBOARD */

    async getLeaderboard({
        limit,
        sortBy,
        order,
		page
	}: LeaderboardDto) : Promise<Partial<User>[]> {
        try {
			console.log(1);
            const users: Partial<User>[] = await this._prismaService.user.findMany({
                skip: page === undefined ? undefined : (Number(page) - 1) * Number(limit),
				orderBy: { [sortBy || "rankPoint"]: order || 'desc' },
                take: limit === undefined ? undefined : Number(limit),
                select: {
                    username: true,
                    level: true,
                    experience: true,
                    avatar: true,
                    rankPoint: true,
                    wins: true,
                    loses: true,
                    played: true
                }
            });

			console.log('users: ', users);

			if (!users)
                throw new NotFoundException('No user found');


            return users;
        } catch(err) {
            if (err instanceof NotFoundException)
                throw err;
            throw new InternalServerErrorException('Internal server error');
        }
    }

    /* FRIENDSHIP */

    async sendFriendRequest(
        senderID: Prisma.UserWhereUniqueInput['id'],
        receiverID: Prisma.UserWhereUniqueInput['id']
    ) : Promise<Friendship> {
        try {
            const friend: User = await this._prismaService.user.findUnique({ where: { id: receiverID } });
            if (!friend)
                throw new NotFoundException('Friend not found');

			try {
				const friendship = await this._prismaService.friendship.update({
					where: {
						senderId_receiverId: {
							senderId: receiverID,
							receiverId: senderID
						}
					},
					data: { accepted: true }
				})

				return friendship;
			} catch(err) {
				const friendRequest = await this._prismaService.friendship.create({
					data: {
						sender: { connect: { id: senderID } },
						receiver: { connect: { id: receiverID } }
					}
				});

				return friendRequest;
			}
        } catch(err) {
            if (err instanceof PrismaClientKnownRequestError)
                if (err.code === 'P2002')
                    throw new ConflictException('Friend request already sent');
                    
            throw new InternalServerErrorException('Internal server error');
        }
    }

    async acceptFriendRequest(
        senderID: Prisma.UserWhereUniqueInput['id'],
        receiverID: Prisma.UserWhereUniqueInput['id']
    ) : Promise<Friendship> {
        try {
            const friend = await this._prismaService.friendship.update({
                where: {
                    senderId_receiverId: {
                        senderId: receiverID,
                        receiverId: senderID
                    }
                },
                data: { accepted: true }
            });

            return friend;
        } catch(err) {
			if (err instanceof PrismaClientKnownRequestError)
				if (err.code === 'P2025')
					throw new NotFoundException('Friend request not found');
            throw new InternalServerErrorException('Internal server error');
        }
    }

    async declineFriendRequest(
        senderID: Prisma.UserWhereUniqueInput['id'],
        receiverID: Prisma.UserWhereUniqueInput['id']
    ) : Promise<Friendship> {
        try {
            const friendship = await this._prismaService.friendship.delete({
                where: {
                    senderId_receiverId: {
                        senderId: senderID,
                        receiverId: receiverID
                    }
                }
            });

            return friendship;
        } catch(err) {
            throw new InternalServerErrorException('Internal server error');
		}
    }

    async getFriends(
        id: Prisma.UserWhereUniqueInput['id'],
    ) : Promise<any> {
        try {
            const friends = await this._prismaService.friendship.findMany({
                where: {
					OR: [
						{ senderId: id },
						{ receiverId: id }
					],
                    accepted: true
                },
                select: {
					sender: {
						select: {
                            id: true,
                            username: true,
                            avatar: true,
                            status: true
                        }
					},
                    receiver: {
                        select: {
                            id: true,
                            username: true,
                            avatar: true,
                            status: true
                        }
                    }
                },
            })

            return friends.map(friend => {
				if (friend.sender.id === id || friend.receiver.id === id)
					delete friend.sender;
			});
        } catch(err) {
            throw new InternalServerErrorException('Internal server error'); 
        }
    }

    async getFriendRequests(
        id: Prisma.UserWhereUniqueInput['id']
    ) : Promise<any> {
        try {
            const friends = await this._prismaService.friendship.findMany({
                where: {
                    receiverId: id,
                    accepted: false
                },
                select: {
                    receiver: {
                        select: {
                            id: true,
                            username: true,
                            avatar: true,
                            status: true
                        }
                    }
                },
            })

            return friends;
        } catch(err) {
            throw new InternalServerErrorException('Internal server error');
        }
    }

    /* CRUD */

    async createUser(
        data: Prisma.UserCreateInput
    ) : Promise<User> {
        try {
			const user = await this._prismaService.user.create({ data });

			delete user.password;

            return user;
        } catch(err) {
            throw new ConflictException("User already exist");
        }
    }

    async getUser(
        where: Prisma.UserWhereUniqueInput
    ) : Promise<User | null> {
        try {
            const user: (User | null) = await this._prismaService.user.findUnique({ where });
			if (!user)
				return null;

			delete user.password;

			return user;
        } catch(err) {
            throw new InternalServerErrorException("Internal server error");
        }
    }

    async getAllUsers(
        where: Prisma.UserWhereInput
    ) : Promise<User[] | null> {
        try {
            const users: (User[] | null) = await this._prismaService.user.findMany({ where });

			users.map(user => delete user.password);

            return users;
        } catch(err) {
            throw new InternalServerErrorException("Internal server error");
        }
    }

    async updateUser(
        where: Prisma.UserWhereUniqueInput,
        data: Prisma.UserUpdateInput
    ) : Promise<User> {
        try {
            const user = await this._prismaService.user.update({ where, data });
			delete user.password;

            return user;
        } catch(err) {
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
