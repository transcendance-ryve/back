import { ChannelType } from "@prisma/client";
import { IsNotEmpty, IsString, IsOptional } from "class-validator";

export class DirectMessageDto {
	@IsNotEmpty()
	@IsString()
	friendId: string;

	@IsNotEmpty()
	@IsString()
	type: string;
}