import { Controller, Post, UseGuards, Body, Req, Get, Param, Res, Delete, Put, Query, InternalServerErrorException } from "@nestjs/common";
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

	@Get('42/redirect')
	// @UseGuards(FortyTwoGuard)
	fortyTwoAuth() : string {
		return "https://api.intra.42.fr/oauth/authorize?client_id=u-s4t2ud-0be07deda32efaa9ac4f060716bd7ee5addaadf80d64008efd9ad3b0b10e8407&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Faccounts%2Flogin&response_type=code"
	}

	@Get('42/callback')
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
			
			res.cookie('access_token', token, { httpOnly: true });
			return token;
		} catch(err) {
			throw new InternalServerErrorException('Internal server error');
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