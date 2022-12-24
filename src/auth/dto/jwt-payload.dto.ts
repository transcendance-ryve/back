import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class JwtPayload {
    @IsNotEmpty()
    @IsNumber()
    id: string;

    @IsNotEmpty()
    @IsString()
    email: string;
}