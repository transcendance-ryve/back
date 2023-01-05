import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class RegisterFortyTwoDto {
    @IsNotEmpty()
	@IsEmail()
    email: string;

    @IsNotEmpty()
    @IsString()
    username: string;

	@IsNotEmpty()
	@IsString()
	avatarURL: string;
}