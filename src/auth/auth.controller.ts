import { Controller, Post, UseGuards, Body, Get, Res, Delete, Put, Query, InternalServerErrorException, UnauthorizedException, HttpStatus } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { FortyTwoGuard } from "./guard/42-auth.guards";
import { LocalAuthGuard } from "./guard/local-auth.guards";
import { Response } from "express";
import { RegisterDto } from "./dto/register.dto";
import { GetCurrentUser } from "src/decorators/user.decorator";
import { User } from "@prisma/client";
import { UsersService } from "src/users/users.service";
import { LoginDto } from "./dto/login-user.dto";
import { toDataURL } from 'qrcode';
import { JwtAuthGuard } from "src/users/guard/jwt.guard";
import { JwtPayloadDto } from "./dto/jwt-payload.dto";
import { RegisterFortyTwoDto } from "./dto/register-forty-two.dto";

@Controller("auth")
export class AuthController {
	constructor(
		private readonly _authService: AuthService,
		private readonly _usersService: UsersService
	) {}

	private _apiURL = "https://api.intra.42.fr/oauth/authorize?client_id=" + process.env.CLIENT_ID + "&redirect_uri=" + process.env.CALLBACK_URL + "&response_type=code";

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
	): Promise<Partial<User> |  { tfa: boolean, token: string, id: string }> {
		const { email, avatarURL } = currentUser;
		let user: Partial<User> = await this._authService.login(email, null, true);

		if (!user) {
			const randomUsername = Math.random().toString(36).substring(7);
			const { secret } = await this._authService.generateTFA(randomUsername);
			user = await this._authService.register(randomUsername, email, null, secret, avatarURL, true);
		} else if (user && user.tfa_enabled) {
			const token = await this._authService.createTFAToken(user.id);
			return { tfa: true, token, id: user.id }
		}

		const token = await this._authService.createToken({
			id: user.id,
			username: user.username,
			tfa_enabled: false,
			tfa_secret: user.tfa_secret
		});
		res.cookie('access_token', token, { httpOnly: true });

		return user;
	}

	@UseGuards(LocalAuthGuard)
	@Post('login')
	async login(
		@GetCurrentUser() currentUser: LoginDto,
		@Res({ passthrough: true }) res: Response
	): Promise<Partial<User> | { tfa: boolean, token: string, id: string }> {
		const { email, password } = currentUser;

		const user: Partial<User> = await this._authService.login(email, password, false);

		if (!user)
			throw new UnauthorizedException('Invalid credentials');
		else if (user && user.tfa_enabled) {
			const token = await this._authService.createTFAToken(user.id);
			return { tfa: true, token, id: user.id }
		}
		
		const token = await this._authService.createToken({
			id: user.id,
			username: user.username,
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

		const { secret }: { qrCode: string, secret: string } = await this._authService.generateTFA(username);
		const user: Partial<User> = await this._authService.register(username, email, password, secret);

		const token = await this._authService.createToken({
			id: user.id,
			username: user.username,
			tfa_enabled: false,
			tfa_secret: secret
		});
		res.cookie('access_token', token, { httpOnly: true });

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
		@Res({ passthrough: true }) res: Response
	): Promise<any> {
		try {
			const { qrCode, secret }: {qrCode: string, secret: string } = await this._authService.generateTFA(currentUser.username);

			await this._usersService.updateUser({ id: currentUser.id }, { tfa_enabled: false, tfa_secret: secret });

			const token = await this._authService.createToken({
				id: currentUser.id,
				username: currentUser.username,
				tfa_enabled: false,
				tfa_secret: secret
			});
			res.cookie('access_token', token, { httpOnly: true });
	
			return toDataURL(qrCode);		
		} catch(err) {
			throw new InternalServerErrorException('An error occured while generating TFA');
		}
	}

	@Get('tfa/qrcode')
	@UseGuards(JwtAuthGuard)
	async getTFA(
		@GetCurrentUser() currentUser: JwtPayloadDto
	): Promise<any> {
		const qrCode: string = this._authService.getTFAQrCode(currentUser);
		return toDataURL(qrCode);	
	}
		
	@Post('tfa/callback')
	async callbackTFA(
		@Body('id') id: string,
		@Body('token') secret: string,
		@Body('code') code: string,
		@Res({ passthrough: true }) res: Response
	): Promise<Partial<User>> {
		const user = await this._usersService.getUser({ id });
		if (!user)
			throw new UnauthorizedException('Invalid user');
		
		if (secret !== user.tfa_token)
			throw new UnauthorizedException('Invalid token');
			
		this._authService.verifyTFA(user.tfa_secret, code);
		
		await this._authService.deleteTFAToken(id);
			
		const token = await this._authService.createToken({
			id: user.id,
			username: user.username,
			tfa_enabled: true,
			tfa_secret: user.tfa_secret
		});
		res.cookie('access_token', token, { httpOnly: true });

		return user;
	}

	@Get('tfa/verify')
	@UseGuards(JwtAuthGuard)
	async tfaVerify(
		@GetCurrentUser() currentUser: JwtPayloadDto,
		@Query('code') code: string
	): Promise<boolean> {
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

		const token: string = await this._authService.createToken({
			id: user.id,
			username: user.username,
			tfa_enabled: user.tfa_enabled,
			tfa_secret: user.tfa_secret
		});
		res.cookie('access_token', token, { httpOnly: true });
	
		return user;
	}
}