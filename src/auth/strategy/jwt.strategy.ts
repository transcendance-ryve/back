import { Strategy, ExtractJwt } from "passport-jwt";
import { Injectable, UnauthorizedException } from "@nestjs/common";
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
                    if (
                        req.cookies !== undefined &&
                        req.cookies.jwtToken &&
                        req.cookies.jwtToken.length > 0
                    ) {
                        console.log(req.cookies.jwtToken);
                        return req.cookies.jwtToken;
                    } else {
                        return null;
                    }
                },
            ]),
            ignoreExpiration: false,
            secretOrKey: 'wartek',
        });
    }

    async validate(payload: JwtPayload) {
        const { email } = payload;
        const user = await this._userService.getUser({ email });

        if (!user)
            throw new UnauthorizedException("User not found");

        return user;
    }
}
