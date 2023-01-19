import { IsString, IsNotEmpty } from "class-validator";

export class TargetDto {
	@IsNotEmpty()
	@IsString()
	targetId: string;
}