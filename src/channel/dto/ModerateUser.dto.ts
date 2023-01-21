import { ChannelActionType } from '@prisma/client';
import { IsNotEmpty, IsString } from 'class-validator';

// eslint-disable-next-line import/prefer-default-export
export class ModerateUserDto {
	@IsNotEmpty()
	@IsString()
		channelId: string;

	@IsNotEmpty()
	@IsString()
		targetId: string;

	@IsNotEmpty()
	@IsString()
		action: ChannelActionType;
}
