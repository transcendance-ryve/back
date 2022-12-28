import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const GetUser = createParamDecorator(
	(data: unknown, ctx: ExecutionContext) => {
		console.log("salut");
		const request: Request = ctx.switchToHttp().getRequest();
		const user: any = request.user;
		
		return user;
	},
);