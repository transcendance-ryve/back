import { Controller, Post, UseGuards, Body, Req, Get, Param, Res, Delete, Put } from "@nestjs/common";
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
	): Promise<string> {
		const { username, password, email, imageURL } = user;
		
		const userData = await this._authService.login(email, password, true);
		if (!userData) {
			const avatar = await downloadImageAndSave(imageURL);
			return this._authService.register({password, username, email, isAuth: true, avatar });
		} else
			return this._authService.createToken(userData);
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
		@GetUser() user: User,
		@Res({ passthrough: true }) res: Response
	): void {
		const token = this._authService.createToken(user);

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