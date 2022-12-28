import { Strategy, ExtractJwt } from "passport-jwt";
import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { UsersService } from "src/users/users.service";
import { JwtPayloadDto } from "../dto/jwt-payload.dto";
import { Request } from "express";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(private readonly _userService: UsersService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: Request) => {
					const { cookies } = req;
                    if (cookies && cookies.access_token && cookies.access_token.length)
                        return cookies.access_token;
                    else {
                        return null;
					}
                },
				(req: any) => {
					if (
						req.handshake?.headers.cookie &&
						req.handshake.headers.cookie.length > 0
					) {
						const accessToken = req.handshake.headers.cookie.split('=').pop();
						if (accessToken && accessToken.length > 0)
							return accessToken;
						else
							return null;
					} else {
					  	return null;
					}
				},
				ExtractJwt.fromAuthHeaderAsBearerToken(),
            ]),
            ignoreExpiration: false,
            secretOrKey: 'wartek',
        });
    }

    async validate(payload: JwtPayloadDto) {
        const { id } = payload;
		
		const user = await this._userService.getUser({ id });
		if (!user)
			throw new UnauthorizedException("User not found");

        return user;
    }
}
