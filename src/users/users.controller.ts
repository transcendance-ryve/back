import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Put,
	Query,
	Res,
	UploadedFile,
	UseGuards,
	UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Prisma, User, Friendship, InviteStatus } from '@prisma/client';
import { Response } from 'express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { GetCurrentUser } from 'src/decorators/user.decorator';
import { JwtAuthGuard } from './guard/jwt.guard';
import { UsersService } from './users.service';
import { JwtPayloadDto } from 'src/auth/dto/jwt-payload.dto';
import { AuthService } from 'src/auth/auth.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(
		private readonly _usersService: UsersService,
		private readonly _authService: AuthService
	) {}

	/* Friends request */

    @Get('friends')
    async getFriends(
        @GetCurrentUser() currentUser: JwtPayloadDto,
		@Query('search') search: string
    ): Promise<User[]> {
        return this._usersService.getFriends(currentUser.id);
    }

    @Get('friends/request')
    async getFriendRequests(
        @GetCurrentUser() currentUser: JwtPayloadDto
    ): Promise<Partial<User>[]> {
        return this._usersService.getFriendRequests(currentUser.id);
    }

    @Post('friends/:id')
    async sendFriendRequest(
        @GetCurrentUser() currentUser: JwtPayloadDto,
        @Param('id') friendId: string
    ): Promise<{sender: Partial<User>, receiver: Partial<User>}> {
        return this._usersService.sendFriendRequest(currentUser.id, friendId);
    }

    @Put('friends/:id')
    async acceptFriendRequest(
        @GetCurrentUser() currentUser: JwtPayloadDto,
        @Param('id') friendId: string
    ): Promise<{sender: Partial<User>, receiver: Partial<User>}> {
        return this._usersService.acceptFriendRequest(currentUser.id, friendId);
    }

    @Delete('friends/:id')
    async declineFriendRequest(
        @GetCurrentUser() currentUser: JwtPayloadDto,
        @Param('id') friendId: string
    ): Promise<{sender: Partial<User>, receiver: Partial<User>}> {
        return this._usersService.removeFriendRequest(currentUser.id, friendId);
    }

	@Get('friends/relationship')
	async getUsersWithRelationship(
		@GetCurrentUser() currentUser: JwtPayloadDto,
		@Query('search') search: string,
		@Query('select') select: string
	): Promise<{ users: { user: Partial<User>, status: InviteStatus, sender: string }[], count: number }> {
		return this._usersService.getUsersWithRelationship(
			currentUser.id,
			search,
			select
		);
	}

	@Get('friends/:id')
	async getUserWithRelationship(
		@GetCurrentUser() currentUser: JwtPayloadDto,
		@Param('id') friendId: string,
		@Query('select') select: string
	): Promise<{ user: Partial<User>, status: InviteStatus, sender: string }> {
		return this._usersService.getUserWithRelationship(currentUser.id, friendId, select);
	}

	/* User */

	@Get('me')
	async getMe(
		@GetCurrentUser() currentUser: JwtPayloadDto
	): Promise<Partial<User>> {
		return this._usersService.getUser({ id: currentUser.id });;
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
		@GetCurrentUser() currentUser: JwtPayloadDto,
		@Param('id') id: Prisma.UserWhereUniqueInput['id']
	): Promise<void> {
		await this._usersService.deleteUser(currentUser.id);
		res.clearCookie('acces_token');
    }

	/* Avatar */

	@Put('avatar')
    @UseInterceptors(
        FileInterceptor('image', {
            storage: diskStorage({
                destination: './data/avatars',
                filename: (req, file, cb) => {
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
        @GetCurrentUser() currentUser: JwtPayloadDto,
        @UploadedFile() avatar: Express.Multer.File,
    ): Promise<Partial<User>> {
        return this._usersService.setAvatar(currentUser.id, avatar);    
    }
	
	/* Username */

    @Put("username")
    async setUsername(
        @GetCurrentUser() currentUser: JwtPayloadDto,
        @Body('username') username: string,
		@Res({ passthrough: true }) res: Response
    ): Promise<Partial<User>> {
		const user: Partial<User> = await this._usersService.updateUser({ id: currentUser.id }, { username });

		const token = await this._authService.createToken({
			id: user.id,
			username: user.username,
			tfa_enabled: user.tfa_enabled,
			tfa_secret: user.tfa_secret
		});
		res.cookie('access_token', token, { httpOnly: true });

        return user;
    }

	/* Password */

	@Put('password')
	async setPassword(
		@GetCurrentUser() currentUser: JwtPayloadDto,
		@Body('old_password') oldPassword: string,
		@Body('password') password: string
	): Promise<Partial<User>> {
		return this._usersService.updatePassword(currentUser.id, oldPassword, password);
	}
}
