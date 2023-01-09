import { ChannelType } from "@prisma/client";
import { IsNotEmpty, IsString, IsOptional } from "class-validator";

export class JoinChannelDto {
	@IsNotEmpty()
	@IsString()
	channelId: string;

	@IsNotEmpty()
	@IsString()
	name: string;

	@IsString()
	@IsNotEmpty()
	status: ChannelType;

	@IsString()
	@IsOptional()
	password?: string;
}