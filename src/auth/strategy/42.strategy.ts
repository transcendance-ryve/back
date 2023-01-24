import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, Profile } from 'passport-42';

@Injectable()
export class FortyTwoStrategy extends PassportStrategy(Strategy, '42') {
    constructor() {
        super({
            clientID: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            callbackURL: process.env.CALLBACK_URL,
		});
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: Profile
    ): Promise<{ email: string, password: string, avatarURL: string}> {
        const {
            emails,
            _json:{
                image: {
                    versions: {
                        large
                    }
                }
            }
        } = profile;

        return {
            email: emails[0].value,
            password: '',
            avatarURL: large
        };
    }
}