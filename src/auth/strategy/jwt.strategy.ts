import { Strategy, ExtractJwt } from "passport-jwt";
import { Injectable, NotFoundException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { UsersService } from "src/users/users.service";
import { JwtPayload } from "../dto/jwt-payload.dto";
import { Request } from "express";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly _userService: UsersService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: Request) => {
					const { cookies } = req;
                    if (cookies && cookies.jwtToken && cookies.jwtToken.length)
                        return cookies.jwtToken;
                    else
                        return null;
                },
            ]),
            ignoreExpiration: false,
            secretOrKey: 'wartek',
        });
    }

    async validate(payload: JwtPayload) {
        const { id } = payload;
        const user = await this._userService.getUser({ id });

        if (!user)
            throw new NotFoundException("User not found");

        return user;
    }
}
