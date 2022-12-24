import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query, Req, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Prisma, User, Friendship } from '@prisma/client';
import { Request, Response } from 'express';
import { createReadStream } from 'fs';
import { diskStorage } from 'multer';
import { extname, resolve } from 'path';
import { LeaderboardDto } from './dto/leaderboard-dto';
import { JwtAuthGuard } from './guard/jwt.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
    constructor(private readonly _usersService: UsersService) {}

    /* GET */

    @Get()
    async getAll(): Promise<User[]> {
        return this._usersService.getAllUsers({});
    }

    @Get('avatar/:id')
    async getAvatar(
        @Param('id') id: Prisma.UserWhereUniqueInput['id'],
        @Res({ passthrough: true }) res: Response
    ): Promise<StreamableFile> {
        const filename = await this._usersService.getAvatar(id);

        const filePath = resolve('./data/avatars', (filename || 'default.png'));
        const file = createReadStream(filePath);

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
        @Req() req: Request
    ): Promise<Partial<User>[]> {
        const { id } = req.user as User;
        return this._usersService.getFriends(id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('friendRequests')
    async getFriendRequests(
        @Req() req: Request
    ): Promise<Partial<User>[]> {
        const { id } = req.user as User;
        return this._usersService.getFriendRequests(id);
    }

    /* POST */

    @UseGuards(JwtAuthGuard)
    @Post('sendFriendRequest/:id')
    async sendFriendRequest(
        @Req() req: Request,
        @Param('id') friendId: string
    ): Promise<Friendship> {
        const { id } = req.user as User;
        return this._usersService.sendFriendRequest(id, friendId);
    }

    /* PUT */

    @UseGuards(JwtAuthGuard)
    @Put("username/:id/:username")
    async setUsername(
        @Req() req: Request,
        @Param('username') username: string
    ) {
        const { id } = req.user as User;

        return this._usersService.updateUser({ id }, { username });
    }

    @UseGuards(JwtAuthGuard)
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
            fileFilter: (req, file, cb) => {
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
        @Req() req: Request,
        @UploadedFile() avatar: Express.Multer.File,
    ) {
        const { id } = req.user as User;
        return this._usersService.setAvatar(id, avatar);    
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
        @Req() req: Request,
        @Param('id') friendId: string
    ): Promise<Friendship> {
        const { id } = req.user as User;
        return this._usersService.acceptFriendRequest(id, friendId);
    }

    /* DELETE */

    @UseGuards(JwtAuthGuard)
    @Delete('declineFriendRequest/:id')
    async declineFriendRequest(
        @Req() req: Request,
        @Param('id') friendId: string
    ): Promise<Friendship> {
        const { id } = req.user as User;
        return this._usersService.declineFriendRequest(id, friendId);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    async delete(@Param('id') id: Prisma.UserWhereUniqueInput['id']): Promise<User> {
        return this._usersService.deleteUser(id);
    }

}
