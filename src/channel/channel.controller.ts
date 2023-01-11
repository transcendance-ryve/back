import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	UseGuards,
	UseInterceptors,
	BadRequestException,
	UploadedFile,
	Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../users/guard/jwt.guard';
import { ChannelActionType, ChannelType, Channel } from '@prisma/client';
import { ChannelService } from './channel.service';
import { GetCurrentUserId } from 'src/decorators/user.decorator';
import { GetCurrentUser } from 'src/decorators/user.decorator';
import { JwtPayloadDto } from 'src/auth/dto/jwt-payload.dto';
import { ChannelGateway } from './channel.gateway';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CreateChannelDto } from './dto';
import { UserIdToSockets } from 'src/users/userIdToSockets.service';

@UseGuards(JwtAuthGuard)
@Controller('channels')
export class ChannelController {
	constructor(
		private readonly channelService: ChannelService,
		private readonly channelGateway: ChannelGateway
		) {}

	@Get()
	getChannels(
		@Query('search') name: string,
	) {
		return this.channelService.getChannels(name);
	}

	//Return all the channels of a user
	@Get('ofUser')
	getChannelsOfUser(
		@GetCurrentUser() currentUser: JwtPayloadDto
	) {
		return this.channelService.getChannelsByUserId(currentUser.id);
	}

	@Get('blockedUser')
	getBlockedUsers(
		@GetCurrentUser() currentUser: JwtPayloadDto
	) {
		return this.channelService.getBlockedUsers(currentUser.id);
	}

	@Get('invites')
	getChannelInvites(@GetCurrentUser() currentUser: JwtPayloadDto) {
		return this.channelService.getChannelInvitesByUser(currentUser.id);
	}

	@Post('createRoom')
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
	async createChannel(
		@GetCurrentUserId() userId: string,
		@Body('createInfo') dto: CreateChannelDto,
		@UploadedFile() avatar: Express.Multer.File,
	) {
		console.log("createRoom called")
		const clientSocket = UserIdToSockets.get(userId);
		let channel: Channel | string | null;
		channel = await this.channelService.createChannelWS(
			dto,
			userId,
			clientSocket,
			avatar,
			this.channelGateway._server,
		);
		if (typeof channel === 'string' || !channel) {
			this.channelGateway._server.to(clientSocket.id).emit('createRoomFailed', channel);
		} else {
			this.channelGateway._server.to(clientSocket.id).emit('roomCreated', channel.id);
		}
	}

	//return a channel by id
	@Get(':id')
	getChannelById(@Param('id') id: string) {
		return this.channelService.getChannelById(id);
	}

	//Return all the members of a channel
	@Get('users/:channelId')
	getUsersOfChannel(@Param('channelId') channelId: string) {
		return this.channelService.getUsersOfChannel(channelId);
	}

	@Get("messages/:channelId")
	getMessagesOfChannel(@Param('channelId') channelId: string) {
		return this.channelService.getMessagesOfChannel(channelId);
	}



	@Get('inviteByChannelId/:id')
	getChannelInvitesByChannelId(@Param('id') channelId: string) {
		return this.channelService.getChannelInvitesByChannel(channelId);
	}

	@Get('muted/:id')
	getMutedUsers(@Param('id') channelId: string) {
		return this.channelService.getMutedUsersOfChannel(channelId);
	}
	
}