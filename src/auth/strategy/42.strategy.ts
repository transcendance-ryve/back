import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, Profile } from 'passport-42';

@Injectable()
export class FortyTwoStrategy extends PassportStrategy(Strategy, '42') {
    constructor() {
        super({
            clientID: 'u-s4t2ud-0be07deda32efaa9ac4f060716bd7ee5addaadf80d64008efd9ad3b0b10e8407',
            clientSecret: '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',
            callbackURL: 'http://localhost:3000/auth/42/redirect',
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