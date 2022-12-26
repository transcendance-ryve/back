import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class JwtPayloadDto {
    @IsNotEmpty()
    @IsNumber()
    id: string;

    @IsNotEmpty()
    @IsString()
    email: string;
}