import { ChannelType } from "@prisma/client";
import { IsNotEmpty, IsString, IsOptional } from "class-validator";

export class CreateChannelDto {
	@IsNotEmpty()
	@IsString()
	name: string;

	@IsString()
	@IsOptional()
	status?: ChannelType;

	@IsString()
	@IsOptional()
	userId?: string;

	@IsString()
	@IsOptional()
	password?: string;
}