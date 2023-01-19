import { IsString, IsNotEmpty } from 'class-validator';

// eslint-disable-next-line import/prefer-default-export
export class TargetDto {
	@IsNotEmpty()
	@IsString()
		targetId: string;
}
