import { Controller, Post, UseGuards, Body, Get, Res, Delete, Put, Query, InternalServerErrorException, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { FortyTwoGuard } from "./guard/42-auth.guards";
import { LocalAuthGuard } from "./guard/local-auth.guards";
import { Response } from "express";
import { RegisterDto } from "./dto/register.dto";
import { GetCurrentUser } from "src/decorators/user.decorator";
import { User } from "@prisma/client";
import { UsersService } from "src/users/users.service";
import { LoginDto } from "./dto/login-user.dto";
import { toFileStream } from 'qrcode';
import { JwtAuthGuard } from "src/users/guard/jwt.guard";
import { JwtPayloadDto } from "./dto/jwt-payload.dto";
import { RegisterFortyTwoDto } from "./dto/register-forty-two.dto";

@Controller("auth")
export class AuthController {
	constructor(
		private readonly _authService: AuthService,
		private readonly _usersService: UsersService
	) {}

	private _loginURL = "http://localhost:5173/accounts/login";
	private _apiURL = "https://api.intra.42.fr/oauth/authorize?client_id=u-s4t2ud-0be07deda32efaa9ac4f060716bd7ee5addaadf80d64008efd9ad3b0b10e8407&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Faccounts%2Flogin&response_type=code";

	/* Login, register and disconnect */

	@Get('42/redirect')
	fortyTwoAuth() : string {
		return this._apiURL;
	}

	@Get('42/callback')
	@UseGuards(FortyTwoGuard)
	async fortyTwoRedirect(
		@GetCurrentUser() currentUser: RegisterFortyTwoDto,
		@Res({ passthrough: true }) res: Response
	): Promise<Partial<User> | void> {
		const { username, email, avatarURL } = currentUser;
		
		let user: Partial<User> = await this._authService.login(email, null, true);
		if (!user)
			user = await this._authService.register(username, email, null, avatarURL, true);			
		else if (user && user.tfa_enabled) 
			return res.redirect(`${this._loginURL}${this._authService.createTFAToken(user.id)}&id=${user.id}`);

		this._authService.createToken({
			id: user.id,
			tfa_enabled: false,
			tfa_secret: null
		}).then(token => res.cookie('access_token', token, { httpOnly: true }));

		return user;
	}

	@UseGuards(LocalAuthGuard)
	@Post('login')
	async login(
		@GetCurrentUser() currentUser: LoginDto,
		@Res({ passthrough: true }) res: Response
	): Promise<Partial<User> | void> {
		const { email, password } = currentUser;

		const user: Partial<User> = await this._authService.login(email, password, false);
		if (user.tfa_enabled)
			return res.redirect(`${this._loginURL}${this._authService.createTFAToken(user.id)}&id=${user.id}`);
		
		const token = await this._authService.createToken({
			id: user.id,
			tfa_enabled: user.tfa_enabled,
			tfa_secret: user.tfa_secret
		});
		res.cookie('access_token', token, { httpOnly: true });
		
		return user;
	}

	@Post('register')
	async register(
		@Res({ passthrough: true }) res: Response,
		@Body() registerInput: RegisterDto,
	): Promise<Partial<User>> {
		const { email, password, username } = registerInput;

		const user = await this._authService.register(username, email, password);

		const token = await this._authService.createToken({
			id: user.id,
			tfa_enabled: false,
			tfa_secret: null
		});
		res.cookie('access_token', token);

		return user;
	}

	@Delete('disconnect')
	disconnect(
		@Res({ passthrough: true }) res: Response
	): void {
		res.clearCookie('access_token');
	}

	/* Two factor authentication */

	@Get('tfa/generate')
	@UseGuards(JwtAuthGuard)
	async generateTFA(
		@GetCurrentUser() currentUser: JwtPayloadDto,
		@Res() res: Response
	): Promise<any> {
		try {
			const { qrCode, secret }: {qrCode: string, secret: string } = await this._authService.generateTFA(currentUser);

			res.setHeader('Content-Type', 'image/png');

			const token = await this._authService.createToken({
				id: currentUser.id,
				tfa_enabled: currentUser.tfa_enabled,
				tfa_secret: secret
			});
			res.cookie('access_token', token, { httpOnly: true });
	
			return await toFileStream(res, qrCode);		
		} catch(err) {
			throw new InternalServerErrorException('An error occured while generating TFA');
		}
	}

	@Get('tfa/qrcode')
	@UseGuards(JwtAuthGuard)
	async getTFA(
		@GetCurrentUser() currentUser: JwtPayloadDto,
		@Res() res: Response
	): Promise<any> {
		const qrCode: string = this._authService.getTFAQrCode(currentUser);

		res.setHeader('Content-Type', 'image/png');

		return toFileStream(res, qrCode);	
	}
		
	@Post('tfa/callback')
	async callbackTFA(
		@Body('id') id: string,
		@Body('token') secret: string,
		@Body('code') code: string,
		@Res({ passthrough: true }) res: Response
	): Promise<Partial<User>> {
		await this._authService.deleteTFAToken(id);

		const user = await this._usersService.getUser({ id });
		if (!user) {
			throw new UnauthorizedException('Invalid user');
		}

		this._authService.verifyTFA(user.tfa_secret, code);

		const token = await this._authService.createToken({ id: user.id, tfa_enabled: true, tfa_secret: user.tfa_secret });
		res.cookie('access_token', token, { httpOnly: true });

		return user;
	}

	@Get('tfa/verify')
	@UseGuards(JwtAuthGuard)
	async tfaVerify(
		@GetCurrentUser() currentUser: JwtPayloadDto,
		@Query('code') code: string
	): Promise<any> {
		return this._authService.verifyTFA(currentUser.tfa_secret, code);
	}

	@Put('tfa/toggle')
	@UseGuards(JwtAuthGuard)
	async tfaEnable(
		@GetCurrentUser() currentUser: JwtPayloadDto,
		@Query('code') code: string,
		@Res({ passthrough: true }) res: Response
	): Promise<Partial<User>> {
		const user: Partial<User> = await this._authService.toggleTFA(currentUser, code);

		const token = await this._authService.createToken({
			id: user.id,
			tfa_enabled: user.tfa_enabled,
			tfa_secret: user.tfa_secret
		});
		res.cookie('access_token', token, { httpOnly: true });
	
		return user;
	}
}