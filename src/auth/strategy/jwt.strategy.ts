import { Strategy, ExtractJwt } from "passport-jwt";
import { Injectable, UnauthorizedException } from "@nestjs/common";
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
                    if (cookies && cookies.access_token && cookies.access_token.length) {
						console.log(cookies.access_token);
                        return cookies.access_token;
					}
                    else {
                        return null;
					}
                }
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
