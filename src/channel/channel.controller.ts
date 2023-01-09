import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../users/guard/jwt.guard';
import { ChannelActionType, ChannelType } from '@prisma/client';
import { ChannelService } from './channel.service';
import { GetCurrentUserId } from 'src/decorators/user.decorator';
import { GetCurrentUser } from 'src/decorators/user.decorator';
import { JwtPayloadDto } from 'src/auth/dto/jwt-payload.dto';


@UseGuards(JwtAuthGuard)
@Controller('channels')
export class ChannelController {
	constructor(private readonly channelService: ChannelService) {}

	@Get('list')
	getChannels() {
		return this.channelService.getChannels();
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

	//Return all the channels of a user
	@Get('ofUser')
	getChannelsOfUser(
		@GetCurrentUser() currentUser: JwtPayloadDto
	) {
		console.log("sa marche?");
		console.log(currentUser.id);
		return this.channelService.getChannelsByUserId(currentUser.id);
	}

	@Get("messages/:channelId")
	getMessagesOfChannel(@Param('channelId') channelId: string) {
		return this.channelService.getMessagesOfChannel(channelId);
	}

	@Get('invitesByUserId/:id')
	getChannelInvites(@Param('id') id: string) {
		return this.channelService.getChannelInvitesByUser(id);
	}

	@Get('inviteByChannelId/:id')
	getChannelInvitesByChannelId(@Param('id') id: string) {
		return this.channelService.getChannelInvitesByChannel(id);
	}
}