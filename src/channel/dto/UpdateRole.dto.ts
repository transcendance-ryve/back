import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateRoleDto {
	@IsNotEmpty()
	@IsString()
	userId: string;

	@IsNotEmpty()
	@IsString()
	channelId: string;
}