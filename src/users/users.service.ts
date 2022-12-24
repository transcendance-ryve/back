import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { Prisma, User, Friendship } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import * as fs from 'fs';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';

@Injectable()
export class UsersService {
    constructor(
        private readonly _prismaService: PrismaService
    ) {}

    private _experienceGain: number = 10;
    private _nextLevelPourcentage: number = 2;
    private _defaultAvatar: string = 'default.png';
    private _rankPointGain: number = 10;

    async getAvatar(
        id: Prisma.UserWhereUniqueInput['id']
    ) : Promise<string> {
        try {
            const user: User = await this._prismaService.user.findUnique({ where: { id } })
            
            if (!user)
                throw new UnauthorizedException('User not found');

            return user.avatar;
        } catch(err) {
            if (err instanceof UnauthorizedException)
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
                throw new UnauthorizedException('Avatar not found');

            const olderAvatar = await this.getAvatar(id);
            if (olderAvatar && olderAvatar !== this._defaultAvatar) {
                await fs.promises.unlink(`./data/avatars/${olderAvatar}`);
            }

            const user: (User | null) = await this._prismaService.user.update({
                where: { id },
                data: { avatar: avatar.filename }
            });

            return user;
        } catch(err) {
            if (err instanceof UnauthorizedException)
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
                throw new UnauthorizedException('User not found');

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
            if (err instanceof UnauthorizedException)
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
            if (err instanceof UnauthorizedException)
                throw err;
            throw new InternalServerErrorException('Internal server error');
        }
    }

    /* LEADERBOARD */

    async getLeaderboard(
        limit: number,
        sortBy: string,
        order: string
    ) : Promise<Partial<User>[]> {
        try {
            const users: Partial<User>[] = await this._prismaService.user.findMany({
                orderBy: { [sortBy || "rankPoint"]: order || 'desc' },
                take: Number(limit) ? Number(limit) : null,
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

            if (!users)
                throw new UnauthorizedException('No user found');

            return users;
        } catch(err) {
            if (err instanceof UnauthorizedException)
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
            const user: User = await this._prismaService.user.findUnique({ where: { id: senderID } });

            if (!user)
                throw new UnauthorizedException('User not found');
            
            const friend: User = await this._prismaService.user.findUnique({ where: { id: receiverID } });

            if (!friend)
                throw new UnauthorizedException('Friend not found');
            
            const friendRequest = await this._prismaService.friendship.create({
                data: {
                    sender: { connect: { id: senderID } },
                    receiver: { connect: { id: receiverID } }
                }
            });

            return friendRequest;
        } catch(err) {
            if (err instanceof PrismaClientKnownRequestError)
                if (err.code === 'P2002')
                    throw new UnauthorizedException('Friend request already sent');
                    
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
                        senderId: senderID,
                        receiverId: receiverID
                    }
                },
                data: { accepted: true }
            });

            return friend;
        } catch(err) {
            if (err instanceof UnauthorizedException)
                throw err;
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
                    senderId: id,
                    accepted: true
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

    async getFriendRequests(
        id: Prisma.UserWhereUniqueInput['id']
    ) : Promise<any> {
        try {
            const friends = await this._prismaService.friendship.findMany({
                where: {
                    senderId: id,
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
            return this._prismaService.user.create({ data });
        } catch(err) {
            throw new UnauthorizedException("User already exist");
        }
    }

    async getUser(
        where: Prisma.UserWhereUniqueInput
    ) : Promise<User | null> {
        try {
            const user: (User | null
            ) = await this._prismaService.user.findUnique({ where });
            if (!user)
                return null;
            
            return user;
        } catch(err) {
            if (err instanceof UnauthorizedException)
                throw err;
            throw new InternalServerErrorException("Internal server error");
        }
    }

    async getAllUsers(
        where: Prisma.UserWhereInput
    ) : Promise<User[] | null> {
        try {
            const users: (User[] | null) = await this._prismaService.user.findMany({ where });
            if (!users)
                return null;

            return users;
        } catch(err) {
            if (err instanceof UnauthorizedException)
                throw err;
            throw new InternalServerErrorException("Internal server error");
        }
    }

    async updateUser(
        where: Prisma.UserWhereUniqueInput,
        data: Prisma.UserUpdateInput
    ) : Promise<User> {
        try {
            const user = await this._prismaService.user.update({ where, data });
            return user;
        } catch(err) {
            throw new InternalServerErrorException("Internal server error");
        }
    }

    async deleteUser(id: Prisma.UserWhereUniqueInput['id']) : Promise<User> {
        try {
            const user: User = await this._prismaService.user.delete({ where: { id } });

            return user;
        } catch(err) {
            if (err instanceof PrismaClientKnownRequestError)
                if (err.code === 'P2025')
                    throw err;

            throw new InternalServerErrorException('Internal server error');
        }
    }
}
