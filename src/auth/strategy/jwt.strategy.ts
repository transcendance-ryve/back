import { Strategy, ExtractJwt } from "passport-jwt";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { UsersService } from "src/users/users.service";
import { JwtPayloadDto } from "../dto/jwt-payload.dto";
import { Request } from "express";
import { parse } from "cookie";

interface HandshakeRequest extends Request {
	handshake?: { headers: { cookie: string } };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(private readonly _userService: UsersService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: HandshakeRequest) => {
					if (
						req.handshake?.headers.cookie &&
						req.handshake.headers.cookie.length > 0
						) {
							const access_token = parse(req.handshake.headers.cookie).access_token;
							if (access_token)
								return access_token;

							return null;
						}
				},
				(req: Request) => {
					const { cookies } = req;
                    if (cookies && cookies.access_token && cookies.access_token.length) {
                        return cookies.access_token;
					}
                    else {
                        return null;
					}
                },
				ExtractJwt.fromAuthHeaderAsBearerToken(),
            ]),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET,
        });
    }

async validate(payload: JwtPayloadDto) {
		const user = await this._userService.getUser({ id: payload.id });
		if (!user)
			throw new UnauthorizedException("User not found");

        return payload;
    }
}
