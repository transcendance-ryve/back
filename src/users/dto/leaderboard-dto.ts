import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class LeaderboardDto {
    @IsNumber()
    @IsOptional()
    limit: number;

    @IsNumber()
    @IsOptional()
    page: number;

    @IsString()
    @IsOptional()
    sortBy: string;

    @IsString()
    @IsOptional()
    order: string;
}