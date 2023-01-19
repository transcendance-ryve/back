import { IsNotEmpty, IsString } from 'class-validator';

// eslint-disable-next-line import/prefer-default-export
export class DirectMessageDto {
	@IsNotEmpty()
	@IsString()
		friendId: string;
}
