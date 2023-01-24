import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, Profile } from 'passport-42';

@Injectable()
export class FortyTwoStrategy extends PassportStrategy(Strategy, '42') {
    constructor() {
        super({
            clientID: 'u-s4t2ud-0be07deda32efaa9ac4f060716bd7ee5addaadf80d64008efd9ad3b0b10e8407',
            clientSecret: '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',
            callbackURL: 'http://localhost:8080/accounts/login',
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