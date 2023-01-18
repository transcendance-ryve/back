import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { userInfo } from 'os';
import { JwtPayloadDto } from 'src/auth/dto/jwt-payload.dto';

export const GetCurrentUser = createParamDecorator(
	(data: unknown, ctx: ExecutionContext) => {
		const request: Request = ctx.switchToHttp().getRequest();
		const user: any = request.user;
		return user;
	},
);

export const GetCurrentUserId = createParamDecorator(
	(data: undefined, context: ExecutionContext): string => {
		interface UserRequest extends Request {
			user: JwtPayloadDto;
		}
		const req = context.switchToHttp().getRequest<UserRequest>();
		return req.user.id;
	},
);