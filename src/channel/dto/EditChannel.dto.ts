import { ChannelType } from '@prisma/client';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

// eslint-disable-next-line import/prefer-default-export
export class EditChannelDto {
	@IsNotEmpty()
	@IsString()
		channelId: string;

	@IsOptional()
	@IsString()
		name?: string;

	@IsString()
	@IsOptional()
		status?: ChannelType;

	@IsString()
	@IsOptional()
		password?: string;
}
