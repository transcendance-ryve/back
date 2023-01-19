import { IsString, IsNotEmpty } from 'class-validator';

// eslint-disable-next-line import/prefer-default-export
export class UpdateRoleDto {
	@IsNotEmpty()
	@IsString()
		userId: string;

	@IsNotEmpty()
	@IsString()
		channelId: string;
}
