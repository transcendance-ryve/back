import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';
import { Request } from 'express';

export const GetUser = createParamDecorator(
	(data: unknown, ctx: ExecutionContext) => {
		const request: Request = ctx.switchToHttp().getRequest();
		const user: any = request.user;
		
		return user;
	},
);