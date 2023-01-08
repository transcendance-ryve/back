import { IsNotEmpty, IsString } from "class-validator";

export class InviteToChannelDto {
	@IsNotEmpty()
	@IsString()
	channelId: string;

	@IsNotEmpty()
	@IsString()
	friendId: string;
}