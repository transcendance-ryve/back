import { IsNotEmpty, IsString } from 'class-validator';

// eslint-disable-next-line import/prefer-default-export
export class LeaveChannelDto {
	@IsNotEmpty()
	@IsString()
		channelId: string;
}
