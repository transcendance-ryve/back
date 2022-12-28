import { Strategy, ExtractJwt } from "passport-jwt";
import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { UsersService } from "src/users/users.service";
import { JwtPayloadDto } from "../dto/jwt-payload.dto";
import { Request } from "express";

export interface HandshakeRequest extends Request {
	handshake?: { headers: { cookie: string } };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(private readonly _userService: UsersService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: Request) => {
					const { cookies } = req;
                    if (cookies && cookies.acces_token && cookies.acces_token.length)
                        return cookies.acces_token;
                    else {
                        return null;
					}
                },
				(req: HandshakeRequest) => {
					if (
						req.handshake?.headers.cookie &&
						req.handshake.headers.cookie.length > 0
					) {
						const jwtToken = req.handshake.headers.cookie.split('=').pop();
						if (jwtToken) return jwtToken;
						return null;
					} else {
					  	return null;
					}
				},
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
