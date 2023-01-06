import { IsBoolean, IsNotEmpty, IsNumber, IsString } from "class-validator";

export class JwtPayloadDto {
    @IsNotEmpty()
    @IsNumber()
    id: string;

	@IsNotEmpty()
	@IsString()
	username: string;

    @IsNotEmpty()
    @IsString()
    tfa_secret: string;

	@IsNotEmpty()
	@IsBoolean()
	tfa_enabled: boolean;
}