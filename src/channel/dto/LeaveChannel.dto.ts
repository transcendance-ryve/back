import { ChannelType } from "@prisma/client";
import { IsNotEmpty, IsString } from "class-validator";

export class LeaveChannelDto {
	@IsNotEmpty()
	@IsString()
	channelId: string;

	@IsNotEmpty()
	@IsString()
	type: ChannelType;
}