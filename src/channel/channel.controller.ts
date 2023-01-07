import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../users/guard/jwt.guard';
import { ChannelActionType } from '@prisma/client';
import { ChannelService } from './channel.service';


@UseGuards(JwtAuthGuard)
@Controller('channels')
export class ChannelController {
	constructor(private readonly channelService: ChannelService) {}

	@Get()
	getChannels() {
		return this.channelService.getChannels();
	}

	@Get(':id')
	getChannelById(@Param('id') id: string) {
		return this.channelService.getChannelById(id);
	}

	@Get('users/:channelId')
	getUsersOfChannel(@Param('channelId') channelId: string) {
		return this.channelService.getUsersOfChannel(channelId);
	}

	@Get(':userId')
	getChannelsOfUser(@Param('userId') userId: string) {
		return this.channelService.getChannelsByUserId(userId);
	}

	@Get("messages/:channelId")
	getMessagesOfChannel(@Param('channelId') channelId: string) {
		return this.channelService.getMessagesOfChannel(channelId);
	}
}