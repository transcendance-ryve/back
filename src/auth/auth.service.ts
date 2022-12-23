import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { Token, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from 'src/prisma.service';
import { MailerService } from '@nestjs-modules/mailer';
import { CreateUserDto } from './dto/create-user.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';

@Injectable()
export class AuthService {
    constructor(
        private readonly _usersService: UsersService,
        private readonly _jwtService: JwtService,
        private readonly _prismaService: PrismaService,
        private readonly _mailerService: MailerService,
    ) {}
    
    private async _sendResetPasswordEmail(email: string, token: string) : Promise<string> {
        try {
            await this._mailerService.sendMail({
                to: email,
                from: '',
                subject: 'Reset password',
                text: 'Reset Password',
                html: `<h1>Reset Password</h1>
                <p>Hello,</p>
                <p>You have requested to reset your password. To reset your password, click on the following link:</p>
                <p><a href="http://localhost:8080/reset-password?token=${token}">Reset my password</a></p>
                <p>If you did not request a password reset, please ignore this email.</p>
                <p>Best regards,</p>
                <p>The support team</p>`,
            });

            return token;
        } catch (err) {
            throw new InternalServerErrorException("Email not sent");
        }
    }
  
    createJwtToken(data: any) : string {
        return this._jwtService.sign({ email: data.email, id: data.id });
    }
    
    async validateUser(email: string, password: string, isAuth: boolean): Promise<any> {
        try {
            const user: (User | null) = await this._usersService.getUser({ email });

            if (!user)
                return null;

            if (!isAuth) {
                if (!user.isAuth) {
                    if (await bcrypt.compare(password, user.password)) {
                        delete user.password;
                        return user;
                    }
                    throw new UnauthorizedException("Wrong password");
                } else throw new UnauthorizedException("Unauthorized to login without OAuth");
            } else {
                delete user.password;
                return user;
            }
        }
        catch(err) {
            if (err instanceof UnauthorizedException)
                throw err;
        }
    }

    async register(userCreateInput: CreateUserDto) : Promise<string> {
        const { password, isAuth } = userCreateInput;

        try {
            let user: User;

            if (!isAuth) {
                const hash: string = await bcrypt.hash(password, 10);
                user = await this._usersService.createUser({ ...userCreateInput, password: hash});
            } else
                user = await this._usersService.createUser(userCreateInput);
            
            return this.createJwtToken(user);
        } catch(err) {
            throw new UnauthorizedException("User already exist");
        }
    }

    async forgotPassword(email: string) : Promise<string> {
        try {
            const user: (User | null) = await this._usersService.getUser({ email });
            if (!user)
                throw new UnauthorizedException("User not found");
  
            const tokenExist = await this._prismaService.token.findUnique({ where: { userId: user.id } });
            if (tokenExist)
                return this._sendResetPasswordEmail(email, tokenExist.token);
            else {
                const token: (Token | null) = await this._prismaService.token.create({
                    data: {
                        token: randomBytes(20).toString('hex'),
                        user: {
                            connect: {
                                id: user.id
                            }
                        }
                    } 
                });
                
                return this._sendResetPasswordEmail(email, token.token);
            }
        } catch (err) {
            
            if (err instanceof PrismaClientKnownRequestError) {
                console.log("Code", err.code);
                if (err.code === 'P2014')
                   throw err;

            }
            if (err instanceof UnauthorizedException)
                throw err;
            throw new InternalServerErrorException("Internal server error");
        }
    }

    async resetPassword(token: string, password: string) : Promise<string> {
        try {
            const tokenData: (Token | null) = await this._prismaService.token.findUnique({ where: { token } });
    
            if (!tokenData)
                throw new UnauthorizedException("Token not found");
            
            const user: (User | null) = await this._usersService.updateUser(
                { id: tokenData.userId },
                { password: await bcrypt.hash(password, 10) }
            );
    
            if (!user)
                throw new UnauthorizedException("User not found");
    
            await this._prismaService.token.delete({ where: { token } });
    
            return this.createJwtToken(user);
        } catch(err) {
            if (err instanceof UnauthorizedException)
                throw err;
            throw new InternalServerErrorException("Internal server error");
        }
    }
}