import { IsNotEmpty, IsString } from 'class-validator';

// eslint-disable-next-line import/prefer-default-export
export class InvitationDto {
	@IsNotEmpty()
	@IsString()
		channelId: string;
}
