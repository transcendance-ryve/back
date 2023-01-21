import { ChannelType } from '@prisma/client';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

// eslint-disable-next-line import/prefer-default-export
export class JoinChannelDto {
	@IsNotEmpty()
	@IsString()
		channelId: string;

	@IsNotEmpty()
	@IsString()
		name: string;

	@IsString()
	@IsNotEmpty()
		status: ChannelType;

	@IsString()
	@IsOptional()
		password?: string;
}
