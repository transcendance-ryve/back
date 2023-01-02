import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, Profile } from 'passport-42';

@Injectable()
export class FortyTwoStrategy extends PassportStrategy(Strategy, '42') {
    constructor() {
        super({
            clientID: 'u-s4t2ud-96e81e964ec1bbf6c9cc5132c99cf7c642332b3b808821f174ef3178e381153e',
            clientSecret: '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',
            callbackURL: 'http://localhost:3000/auth/42/redirect',
			scope: ['public']
		});
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: Profile
    ): Promise<{ email: string, username: string, password: string, avatarURL: string}> {
        const {
            username,
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
            username: username,
            password: '',
            avatarURL: large
        };
    }
}