import { IsNotEmpty, IsString } from 'class-validator';

export class InvitationDto {
	@IsNotEmpty()
	@IsString()
	id: string;
}