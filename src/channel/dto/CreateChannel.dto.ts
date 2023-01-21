import { ChannelType } from '@prisma/client';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

// eslint-disable-next-line import/prefer-default-export
export class CreateChannelDto {
	@IsNotEmpty()
	@IsString()
		name: string;

	@IsString()
	@IsOptional()
		status?: ChannelType;

	@IsString()
	@IsOptional()
		password?: string;

	@IsOptional()
		users?: { id: string[] };
}
