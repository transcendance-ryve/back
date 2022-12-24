import { Controller, Post, UseGuards, Body, Req, Get, Param, Res, Delete } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { FortyTwoGuard } from "./guard/42-auth.guards";
import { LocalAuthGuard } from "./guard/local-auth.guards";
import { downloadImageAndSave } from "src/utils";
import { Request, Response } from "express";
import { CreateUserDto } from "./dto/create-user.dto";
import { emitWarning } from "process";

@Controller("auth")
export class AuthController {
    constructor(private readonly _authService: AuthService) {}

	/* GET */

	@UseGuards(LocalAuthGuard)
	@Get('login')
    login(
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response
	) : void {
		const token = this._authService.createJwtToken(req.user);
        res.cookie('jwtToken', token);
    }

	@UseGuards(FortyTwoGuard)
    @Get('42')
    fortyTwoAuth() {}

    @Get('42/redirect')
    @UseGuards(FortyTwoGuard)
    async fortyTwoRedirect(@Req() req: any) {
		const { username, password, email, imageURL } = req.user;
        
        const user = await this._authService.validateUser(email, password, true);
        if (!user) {
            const avatar = await downloadImageAndSave(imageURL);
			return this._authService.register({password, username, email, isAuth: true, avatar });
        } else
            return this._authService.createJwtToken(user);
    }

    @Get('reset-password/:token')
    async resetPassword(
		@Param('token') token: string,
		@Body('password') password: string
	) : Promise<string> {
        return this._authService.resetPassword(token, password);
    }
	
	/* POST */

	@Post('register')
    async register(
        @Res({ passthrough: true }) res: Response,
        @Body() userCreateInput: CreateUserDto,
    ) : Promise<void> {
        const token = await this._authService.register({isAuth: false, ...userCreateInput});

        res.cookie('jwtToken', token);
    }

	@Post('forgot-password')
    async forgotPassword(
		@Body('email') email: string
	) : Promise<string> {
        return this._authService.forgotPassword(email);
    }

	/* DELETE */

	@Delete('disconnect')
	disconnect(
		@Res({ passthrough: true }) res: Response
	) : void {
		res.clearCookie('jwtToken');
	}
}