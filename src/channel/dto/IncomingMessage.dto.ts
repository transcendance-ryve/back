import { IsNotEmpty, IsString } from "class-validator";

export class IncomingMessageDto {
	@IsNotEmpty()
	@IsString()
	channelId: string;

	@IsNotEmpty()
	@IsString()
	content: string;
}