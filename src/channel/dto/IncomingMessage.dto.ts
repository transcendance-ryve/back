import { IsNotEmpty, IsString } from 'class-validator';

// eslint-disable-next-line import/prefer-default-export
export class IncomingMessageDto {
	@IsNotEmpty()
	@IsString()
		channelId: string;

	@IsNotEmpty()
	@IsString()
		content: string;
}
