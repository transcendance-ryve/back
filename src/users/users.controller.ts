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

	@Get('me')
	getMe(
		@GetUser() user: User
	): User {
		return user;
	}
	
    @Get()
    async getAll(): Promise<User[]> {
        return this._usersService.getAllUsers({});
    }

	@Get('leaderboard')
    async getLeaderboard(
		@Query('search') search: string,
		@Query('page') page: number,
		@Query('take') take: number,
		@Query('sort') sort: string,
		@Query('order') order: string,
    ): Promise<{ users: Partial<User>[], usersCount: number }> {
		return this._usersService.getLeaderboard({ search, take, page, sort, order });
    }

	@Get(':id')
	async getUserByID(
		@Param('id') id: string
	): Promise<any> {
		return this._usersService.getUser({ id });
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
		@Param('id') target: Prisma.UserWhereUniqueInput['id']
	): Promise<any> {
		return this._usersService.getProfile(user.id, target);
	}
	
	/* Avatar request */

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
