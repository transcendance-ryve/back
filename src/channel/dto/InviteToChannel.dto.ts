import { IsNotEmpty, IsString } from 'class-validator';

// eslint-disable-next-line import/prefer-default-export
export class InviteToChannelDto {
	@IsNotEmpty()
	@IsString()
		channelId: string;

	@IsNotEmpty()
	@IsString()
		friendId: string;
}
