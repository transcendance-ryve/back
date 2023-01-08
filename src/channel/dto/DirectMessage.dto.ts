import { IsNotEmpty, IsString, IsOptional } from "class-validator";

export class DirectMessageDto {
	@IsNotEmpty()
	@IsString()
	friendId: string;
}