import { Controller, Post, UseGuards, Body, Req, Get, Param, Res, Delete, Put, Query } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { FortyTwoGuard } from "./guard/42-auth.guards";
import { LocalAuthGuard } from "./guard/local-auth.guards";
import { downloadImageAndSave } from "src/utils";
import { Response } from "express";
import { CreateUserDto } from "./dto/create-user.dto";
import { GetUser } from "src/decorators/user.decorator";
import { User } from "@prisma/client";

@Controller("auth")
export class AuthController {
	constructor(private readonly _authService: AuthService) {}

	/* GET */

	@UseGuards(FortyTwoGuard)
	@Get('42')
	fortyTwoAuth() : void {}

	@Get('42/redirect')
	@UseGuards(FortyTwoGuard)
	async fortyTwoRedirect(
		@GetUser() user: any,
		@Res({ passthrough: true }) res: Response
	): Promise<void> {
		const { username, password, email, avatarURL } = user;
		
		try {
			let token = await this._authService.login(email, password, true);
			if (!token)
				token = await this._authService.register({password, username, email, isAuth: true, avatarURL });

			res.cookie('access_token', token, { httpOnly: true }).redirect('http://localhost:5173');
		} catch(err) {
			res.redirect('http://localhost:5173');
		}
	}

	@Get('reset-password/:token')
	async resetPassword(
		@Param('token') token: string,
		@Body('password') password: string
	): Promise<string> {
		return this._authService.resetPassword(token, password);
	}
	
	/* POST */

	@UseGuards(LocalAuthGuard)
	@Post('login')
	login(
		@GetUser() token: string,
		@Res({ passthrough: true }) res: Response
	): void {
		res.cookie('access_token', token, { httpOnly: true });
	}

	@Post('register')
	async register(
		@Res({ passthrough: true }) res: Response,
		@Body() userCreateInput: CreateUserDto,
	): Promise<void> {
		const token = await this._authService.register({isAuth: false, ...userCreateInput});

		res.cookie('access_token', token);
	}

	@Post('forgot-password')
	async forgotPassword(
		@Body('email') email: string
	): Promise<string> {
		return this._authService.forgotPassword(email);
	}

	/* DELETE */

	@Delete('disconnect')
	disconnect(
		@Res({ passthrough: true }) res: Response
	): void {
		res.clearCookie('access_token');
	}
}