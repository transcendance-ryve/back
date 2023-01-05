import { Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { User } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from 'src/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { downloadImageAndSave } from 'src/utils';
import { authenticator } from 'otplib';
import { JwtPayloadDto } from './dto/jwt-payload.dto';
import { toDataURL } from 'qrcode';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private readonly _usersService: UsersService,
        private readonly _jwtService: JwtService,
        private readonly _prismaService: PrismaService
    ) {}

	private _staticPath = "http://localhost:3000/";

	async createToken(data: JwtPayloadDto) : Promise<string> {
		return this._jwtService.signAsync({
			id: data.id,
			tfa_secret: data.tfa_secret,
			tfa_enabled: data.tfa_enabled,
		}).then((token) => {
			return token;
		}).catch((err) => {
			return err.message;
		});
    }

    async login(
		email: string,
		password: string,
		auth: boolean
	): Promise<Partial<User>> {
        try {
            const user: (User | null) = await this._prismaService.user.findUnique({ where: { email } });

            if (!user)
                return null;

            if (!auth) {
                if (!user.auth) {
                    if (!await bcrypt.compare(password, user.password))
						throw new UnauthorizedException("Wrong password");
				} else throw new UnauthorizedException("Unauthorized to login without OAuth");
            } else if (auth && !user.auth)
				throw new UnauthorizedException("Unauthorized to login with OAuth");

			delete user.password;
			return user;
		}
        catch(err) {
            if (err instanceof UnauthorizedException)
                throw err;
        }
    }

    async register(
		username: string,
		email: string,
		password: string,
		avatarURL?: string,
		auth?: boolean
	) : Promise<Partial<User>> {
        try {
			if (auth) {
				const avatar = await downloadImageAndSave(avatarURL);

				return this._usersService.createUser({
					username,
					email,
					password: null,
					avatar: `${this._staticPath}${avatar}`,
					auth
				});

			} else {
				const hashedPassword = await bcrypt.hash(password, 10);

				return this._usersService.createUser({
					username,
					email,
					password: hashedPassword,
					auth
				});
			}
        } catch(err) {
            throw new UnauthorizedException("User already exist");
        }
    }

	/* Two factor authentication */

	async createTFAToken(id: string) : Promise<string> {
		try {
			const token = randomBytes(20).toString('hex');
			await this._usersService.updateUser({ id }, { tfa_token: token });

			return token;
		} catch(err) {
			if (err instanceof PrismaClientKnownRequestError)
				if (err.code === 'P2014')
				   throw new NotFoundException("User not found");

			throw new InternalServerErrorException("Internal server error");
		}
	}

	async deleteTFAToken(id: string) : Promise<void> {
		try {
			await this._usersService.updateUser({ id }, { tfa_token: null });
		} catch(err) {
			if (err instanceof NotFoundException)
				throw err;

			throw new InternalServerErrorException("Internal server error");
		}
	}
	
	async toggleTFA(payload: JwtPayloadDto, token: string) : Promise<User> {
		try {
			this.verifyTFA(payload.tfa_secret, token);

			return this._usersService.updateUser({ id: payload.id }, { tfa_enabled: !payload.tfa_enabled });
		} catch(err) {
			throw err;
		}
	}
			
	async generateTFA(payload: JwtPayloadDto) : Promise<{ qrCode: string, secret: string }> {
		const secret: string = authenticator.generateSecret();
		const qrCode: string = authenticator.keyuri(payload.id, 'Ryve', secret);

		await this._usersService.updateUser({ id: payload.id }, { tfa_secret: secret });
		
		return {
			qrCode,
			secret
		};
	}

	getTFAQrCode(payload: JwtPayloadDto) : string {
		if (!payload.tfa_secret)
			throw new UnauthorizedException("Please generate a secret first");

		return authenticator.keyuri(payload.id, 'Ryve', payload.tfa_secret);
	}


	verifyTFA(secret: string, token: string) : boolean {
		const authorize = authenticator.verify({ secret, token });
		
		if (!authorize)
			throw new UnauthorizedException("Invalid code");

		return authorize;
	}
}