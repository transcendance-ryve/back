import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Prisma, User, Friendship } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import { join } from 'path';


@Injectable()
export class UsersService {
    constructor(
        private readonly _prismaService: PrismaService
    ) {}

    private _experienceGain: number = 10;
    private _nextLevelPourcentage: number = 2;
    private _rankPointGain: number = 10;

    async setAvatar(
        id: Prisma.UserWhereUniqueInput['id'],
        avatar: Express.Multer.File
    ) : Promise<User> {
        try {
            if (!avatar)
                throw new NotFoundException('Avatar not found');

			const staticPath = "http://localhost:3000/";

			const user: User = await this._prismaService.user.findUnique({ where: { id } });
			if (user.avatar !== `${staticPath}default.png`)
				fs.unlinkSync(join(process.cwd(), 'data/avatars/', user.avatar.split('/').pop()));

            return this.updateUser(
                { id },
                { avatar: `${staticPath}${avatar.filename}` }
            );
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

            if (newExperience >= user.next_level) {
                return this._prismaService.user.update({
                    where: { id },
                    data: {
                        experience: newExperience - user.next_level,
                        level: { increment: 1 },
                        next_level: { multiply: this._nextLevelPourcentage }
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
                data: { rank_point: { increment: point } }
            });
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
						sender_id_receiver_id: {
							sender_id: receiverID,
							receiver_id: senderID
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
					sender_id_receiver_id: {
                        sender_id: receiverID,
                        receiver_id: senderID
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
                    sender_id_receiver_id: {
                        sender_id: senderID,
                        receiver_id: receiverID
                    }
                }
            });

            return friendship;
        } catch(err) {
            throw new InternalServerErrorException('Internal server error');
		}
    }

	async updatePassword(
		id: string,
		oldPassword: string,
		newPassword: string
	) : Promise<User> {
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
            const friends = await this._prismaService.friendship.findMany({
                where: {
					OR: [
						{ sender_id: id },
						{ receiver_id: id }
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

			const friendsList = friends.map(friend => {
				if (friend.sender.id === id)
					delete friend.sender;
				else
					delete friend.receiver;

				if (friend.sender) return friend.sender;
				else return friend.receiver;
			})

            return friendsList;
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
                    receiver_id: id,
                    accepted: false
                },
                select: {
                    sender: {
                        select: {
                            id: true,
                            username: true,
                            avatar: true,
                            status: true
                        }
                    }
                },
            })

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
            throw new ConflictException("User already exist");
        }
    }

	async getUserWithRelationship(
		id: Prisma.UserWhereUniqueInput['id'],
		target: Prisma.UserWhereUniqueInput['id'],
		selected?: string
	) : Promise<{user: Partial<User>, isFriend: boolean}> {
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
			return { user, isFriend: friendStatus ? friendStatus.accepted : false};
        } catch(err) {
			if (err instanceof NotFoundException)
				throw err;
            throw new InternalServerErrorException("Internal server error");
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
				where: { username: { contains: search } },
				skip: skip || (page - 1) * take || undefined,
				take: take || 12,
				orderBy: { [sort || "username"]: order === 'asc' ? 'asc' : 'desc' },
				select: (selected && selected.length > 0) ? select : undefined
			});

			users.map(user => delete user.password);

			const count = await this._prismaService.user.count({
				where: { username: { contains: search } }
			});

			return { users, count };
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
			if (err instanceof PrismaClientKnownRequestError)
				if (err.code === 'P2025')
					throw new NotFoundException('User not found');
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
