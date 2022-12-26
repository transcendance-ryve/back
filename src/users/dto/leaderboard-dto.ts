import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class LeaderboardDto {
    @Type(() => Number)
	@IsNumber()
    @IsOptional()
    limit: number;

	@Type(() => Number)
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