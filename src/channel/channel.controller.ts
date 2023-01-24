import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Put,
	UseGuards,
	UseInterceptors,
	BadRequestException,
	UploadedFile,
	Query,
} from '@nestjs/common';
import { UserIdToSockets } from 'src/users/userIdToSockets.service';
import { extname } from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { JwtPayloadDto } from 'src/auth/dto/jwt-payload.dto';
import { Channel } from '@prisma/client';
import { GetCurrentUserId, GetCurrentUser } from 'src/decorators/user.decorator';
import { JwtAuthGuard } from '../users/guard/jwt.guard';
import ChannelService from './channel.service';
import ChannelGateway from './channel.gateway';
import { CreateChannelDto, EditChannelDto } from './dto';
import { InvitaionTag, UserTag } from './interfaces/utils.interfaces';

@UseGuards(JwtAuthGuard)
@Controller('channels')
export default class ChannelController {
	constructor(
		// eslint-disable-next-line no-unused-vars
		private readonly channelService: ChannelService,
		// eslint-disable-next-line no-unused-vars
		private readonly channelGateway: ChannelGateway,
	// eslint-disable-next-line no-empty-function
	) {}

	@Get()
	getChannels(
		@GetCurrentUser() currentUser: JwtPayloadDto,
		@Query('search') name: string,
	): Promise<Channel[]> {
		return this.channelService.getChannels(name, currentUser.id);
	}

	// return all the channels of a user
	@Get('ofUser')
	getChannelsOfUser(
		@GetCurrentUser() currentUser: JwtPayloadDto,
	): Promise<Partial<Channel>[]> {
		return this.channelService.getChannelsByUserId(currentUser.id);
	}

	@Get('invites')
	getChannelInvites(
		@GetCurrentUser() currentUser: JwtPayloadDto,
	): Promise<InvitaionTag[] | string> {
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
				},
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
				if (allowedMimes.includes(file.mimetype)) cb(null, true);
				else cb(new BadRequestException('Invalid file type'), false);
			},
		}),
	)
	async createChannel(
		@GetCurrentUserId() userId: string,
		@Body('createInfo') dto: CreateChannelDto,
		@UploadedFile() avatar: Express.Multer.File,
	): Promise<void> {
		const clientSocket = UserIdToSockets.get(userId);
		const channel:
		Channel | string = await this.channelService.createChannelWS(
			dto,
			userId,
			clientSocket,
			avatar,
			this.channelGateway._server,
		);
		if (typeof channel === 'string' || !channel) UserIdToSockets.emit(userId, this.channelGateway._server, 'createRoomFailed', channel);
		else UserIdToSockets.emit(userId, this.channelGateway._server, 'roomCreated', channel.id);
	}

	@Put('editRoom')
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
				},
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
				if (allowedMimes.includes(file.mimetype)) cb(null, true);
				else cb(new BadRequestException('Invalid file type'), false);
			},
		}),
	)
	async editChannel(
		@GetCurrentUserId() userId: string,
		@Body('editInfo') editInfo: EditChannelDto,
		@UploadedFile() avatar: Express.Multer.File,
	): Promise<void> {
		const channelEdited = await this.channelService.editChannel(
			userId,
			editInfo,
			avatar,
		);
		if (typeof channelEdited === 'string' || !channelEdited) {
			UserIdToSockets.emit(userId, this.channelGateway._server, 'editRoomFailed', channelEdited);
		} else {
			UserIdToSockets.emit(userId, this.channelGateway._server, 'roomEdited');
			this.channelGateway._server.to(channelEdited.id).emit('roomUpdated', channelEdited);
		}
	}

	@Get('isBlocked/:targetId')
	async isBlocked(
		@GetCurrentUserId() userId: string,
		@Param('targetId') target: string,
	) : Promise<string> {
		const isBlocked: boolean | string = await this.channelService.isBlockedRelation(userId, target);
		if (isBlocked === 'target_blocked') return ('targetBlocked');
		if (isBlocked === 'user_blocked') return ('userBlocked');
		return ('noBlockedRelation');
	}

	// return a channel by id
	@Get(':id')
	getChannelById(@Param('id') id: string) : Promise<Partial<Channel> | null> {
		return this.channelService.getChannelById({ id });
	}

	// return all the members of a channel
	@Get('users/:channelId')
	getUsersOfChannel(
		@Param('channelId') channelId: string,
		@GetCurrentUserId() userId: string,
	) : Promise<UserTag[]> {
		return this.channelService.getUsersOfChannel(channelId, userId);
	}

	@Get('messages/:channelId')
	getMessagesOfChannel(
		@Param('channelId') channelId: string,
		@Query('page') page: number,
		@Query('take') take: number,
		@GetCurrentUserId() userId: string,
	) : Promise<any> {
		return this.channelService.getMessagesOfChannel(channelId, page, take, userId);
	}

	@Get('muted/:id')
	getMutedUsers(@Param('id') channelId: string): Promise<any> {
		return this.channelService.getMutedUsersOfChannel(channelId);
	}

	@Get('banned/:id')
	getBannedUsers(@Param('id') channelId: string): Promise<any> {
		return this.channelService.getBannedUsersOfChannel(channelId);
	}

	@Get('pending/:id')
	getPendingInvites(@Param('id') channelId: string): Promise<any> {
		return this.channelService.getPendingInvitesOfChannel(channelId);
	}
}
