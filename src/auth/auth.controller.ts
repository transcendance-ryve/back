import { Controller, Post, UseGuards, Body, Req, Get, Param } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { FortyTwoGuard } from "./guard/42-auth.guards";
import { LocalAuthGuard } from "./guard/local-auth.guards";
import { downloadImageAndSave } from "src/utils";
import { Request } from "express";
import { CreateUserDto } from "./dto/create-user.dto";

@Controller("auth")
export class AuthController {
    constructor(private readonly _authService: AuthService) {}

    @UseGuards(LocalAuthGuard)
    @Post('login')
    login(@Req() req: Request) {
        if (req.user)
            return this._authService.createJwtToken(req.user);
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

    @Post('register')
    async register(@Body() userCreateInput: CreateUserDto) {
        return this._authService.register({ isAuth: false, ...userCreateInput });;
    }

    @Post('forgot-password')
    async forgotPassword(@Body('email') email: string) {
        return this._authService.forgotPassword(email);
    }

    @Get('reset-password/:token')
    async resetPassword(@Param('token') token: string, @Body('password') password: string) {
        return this._authService.resetPassword(token, password);
    }
}