import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query, Req, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Prisma, User, Friendship } from '@prisma/client';
import { Response } from 'express';
import { createReadStream, ReadStream } from 'fs';
import { diskStorage } from 'multer';
import { extname, resolve } from 'path';
import { GetUser } from 'src/decorators/user.decorator';
import { LeaderboardDto } from './dto/leaderboard-dto';
import { JwtAuthGuard } from './guard/jwt.guard';
import { UsersService } from './users.service';


@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private readonly _usersService: UsersService) {}

	/* Friends request */

    @Get('friends')
    async getFriends(
        @GetUser() user: User
    ): Promise<User[]> {
        return this._usersService.getFriends(user.id);
    }

    @Get('friends/request')
    async getFriendRequests(
        @GetUser() user: User
    ): Promise<Partial<User>[]> {
        return this._usersService.getFriendRequests(user.id);
    }

    @Post('friends/:id')
    async sendFriendRequest(
        @GetUser() user: User,
        @Param('id') friendId: string
    ): Promise<Friendship> {
        return this._usersService.sendFriendRequest(user.id, friendId);
    }

    @Put('friends/:id')
    async acceptFriendRequest(
        @GetUser() user: User,
        @Param('id') friendId: string
    ): Promise<Friendship> {
        return this._usersService.acceptFriendRequest(user.id, friendId);
    }

    @Delete('friends/:id')
    async declineFriendRequest(
        @GetUser() user: User,
        @Param('id') friendId: string
    ): Promise<Friendship> {
        return this._usersService.declineFriendRequest(user.id, friendId);
    }

	@Get('friends/:id')
	async getUserWithRelationship(
		@GetUser() user: User,
		@Param('id') friendId: string,
		@Query('select') select: string
	): Promise<{user: Partial<User>, isFriend: boolean}> {
		return this._usersService.getUserWithRelationship(user.id, friendId, select);
	}

	@Get('me')
	getMe(
		@GetUser() user: User
	): User {
		return user;
	}
	
    @Get()
	async getAll(
		@Query('search') search: string,
		@Query('page') page: string,
		@Query('take') take: string,
		@Query('sort') sort: string,
		@Query('order') order: string,
		@Query('skip') skip: string,
		@Query('select') select: string
	): Promise<{ users: Partial<User>[], count: number }>  {
        return this._usersService.getUsers(
			search,
			Number(take) || undefined,
			Number(page) || undefined,
			sort,
			order,
			Number(skip) || undefined,
			select
		);
    }

	@Get(':id')
	async getUserByID(
		@Param('id') id: string,
		@Query('select') select: string
	): Promise<any> {
		return this._usersService.getUser({ id }, select);
	}

	@Delete()
    async delete(
		@Res({ passthrough: true }) res: Response,
		@GetUser() user: User,
		@Param('id') id: Prisma.UserWhereUniqueInput['id']
	): Promise<User> {
		await this._usersService.deleteUser(user.id);
		res.clearCookie('acces_token');

        return user;
    }

	@Get('profile/:id')
	async getProfile(
		@GetUser() user: User,
		@Param('id') target: Prisma.UserWhereUniqueInput['id'],
		@Query('select') select: string
	): Promise<any> {
		return this._usersService.getUserWithRelationship(user.id, target, select);
	}
	
	/* Avatar request */

	@Put('avatar')
    @UseInterceptors(
        FileInterceptor('image', {
            storage: diskStorage({
                destination: './data/avatars',
                filename: (req, file, cb) => {
					const { id } = req.user as User;

                    return cb(null, `${id}${extname(file.originalname)}`);
                }
            }),
            limits: {
                fileSize: 5 * 1024 * 1024,
                files: 1,
            },
            fileFilter: (_, file, cb) => {
                const allowedMimes = [
                    'image/jpg',
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

	
    @Put("username")
    async setUsername(
        @GetUser() user: User,
        @Body('username') username: string
    ): Promise<Partial<User>> {
        return this._usersService.updateUser({ id: user.id }, { username });
    }

    @Put('experience/:id')
    async setExperience(
        @Param('id') id: Prisma.UserWhereUniqueInput['id'],
        @Body('point') point: number
    ): Promise<User> {
        return this._usersService.addExperience(id, point);
    }
}
