import { IsNotEmpty, IsString } from 'class-validator';

export class InvitationDto {
	@IsNotEmpty()
	@IsString()
	channelId: string;
}