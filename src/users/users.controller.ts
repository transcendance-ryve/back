import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query, Req, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Prisma, User, Friendship } from '@prisma/client';
import { Request, Response } from 'express';
import { createReadStream, ReadStream } from 'fs';
import { diskStorage } from 'multer';
import { extname, resolve } from 'path';
import { GetUser } from 'src/decorators/user.decorator';
import { LeaderboardDto } from './dto/leaderboard-dto';
import { JwtAuthGuard } from './guard/jwt.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
    constructor(private readonly _usersService: UsersService) {}

    /* GET */

	@Get('me')
	@UseGuards(JwtAuthGuard)
	getMe(
		@GetUser() user: User
	): User {
		return user;
	}

    @Get()
    async getAll(): Promise<User[]> {
        return this._usersService.getAllUsers({});
    }

    @Get('avatar/:id')
    async getAvatar(
        @Param('id') id: Prisma.UserWhereUniqueInput['id'],
        @Res({ passthrough: true }) res: Response
    ): Promise<StreamableFile> {
        const filename: string = await this._usersService.getAvatar(id);

        const filePath: string = resolve('./data/avatars', (filename || 'default.png'));
        const file: ReadStream = createReadStream(filePath);

        res.set({
            'Content-Disposition': `inline; filename="${filename}"`,
            'Content-Type': 'image/*',
        });

        return new StreamableFile(file);
    }

    @Get('leaderboard')
    async getLeaderboard(
        @Query() { limit, sortBy, order }: LeaderboardDto
    ): Promise<Partial<User>[]> {
        return this._usersService.getLeaderboard(
            limit,
            sortBy,
            order
        );
    }

    @UseGuards(JwtAuthGuard)
    @Get('friends')
    async getFriends(
        @GetUser() user: User
    ): Promise<User[]> {
        return this._usersService.getFriends(user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('friendRequests')
    async getFriendRequests(
        @GetUser() user: User
    ): Promise<Partial<User>[]> {
        return this._usersService.getFriendRequests(user.id);
    }

    /* POST */

    @UseGuards(JwtAuthGuard)
    @Post('sendFriendRequest/:id')
    async sendFriendRequest(
        @GetUser() user: User,
        @Param('id') friendId: string
    ): Promise<Friendship> {
        return this._usersService.sendFriendRequest(user.id, friendId);
    }

    /* PUT */

    @UseGuards(JwtAuthGuard)
    @Put("username")
    async setUsername(
        @GetUser() user: User,
        @Body('username') username: string
    ): Promise<Partial<User>> {
        return this._usersService.updateUser({ id: user.id }, { username });
    }

    @UseGuards(JwtAuthGuard)
    @Put('avatar')
    @UseInterceptors(
        FileInterceptor('image', {
            storage: diskStorage({
                destination: './data/avatars',
                filename: (_, file, cb) => {
                    const randomName = Array(32)
                        .fill(null)
                        .map(() => Math.round(Math.random() * 16).toString(16))
                        .join('');
                    return cb(null, `${randomName}${extname(file.originalname)}`);
                }
            }),
            limits: {
                fileSize: 5 * 1024 * 1024,
                files: 1,
            },
            fileFilter: (_, file, cb) => {
                const allowedMimes = [
                    'image/jpeg',
                    'image/png',
                    'image/gif',
                ];
                if (allowedMimes.includes(file.mimetype))
                    cb(null, true);
                else
                    cb(new BadRequestException('Invalid file type'), false);
            }
        }),
    )
    async setAvatar(
        @GetUser() user: User,
        @UploadedFile() avatar: Express.Multer.File,
    ): Promise<Partial<User>> {
        return this._usersService.setAvatar(user.id, avatar);    
    }

    @UseGuards(JwtAuthGuard)
    @Put('experience/:id')
    async setExperience(
        @Param('id') id: Prisma.UserWhereUniqueInput['id'],
        @Body('point') point: number
    ): Promise<User> {
        return this._usersService.addExperience(id, point);
    }

    @UseGuards(JwtAuthGuard)
    @Put('acceptFriendRequest/:id')
    async acceptFriendRequest(
        @GetUser() user: User,
        @Param('id') friendId: string
    ): Promise<Friendship> {
        return this._usersService.acceptFriendRequest(user.id, friendId);
    }

    /* DELETE */

    @UseGuards(JwtAuthGuard)
    @Delete('declineFriendRequest/:id')
    async declineFriendRequest(
        @GetUser() user: User,
        @Param('id') friendId: string
    ): Promise<Friendship> {
        return this._usersService.declineFriendRequest(user.id, friendId);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    async delete(@Param('id') id: Prisma.UserWhereUniqueInput['id']): Promise<User> {
        return this._usersService.deleteUser(id);
    }

}
