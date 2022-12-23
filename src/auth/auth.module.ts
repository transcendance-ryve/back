import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaService } from 'src/prisma.service';
import { UsersModule } from 'src/users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FortyTwoStrategy } from './strategy/42.strategy';
import { JwtStrategy } from './strategy/jwt.strategy';
import { LocalStrategy } from './strategy/local.strategy';

@Module({
    imports: [
        UsersModule,
        PassportModule,
        JwtModule.register({
            secret: 'wartek',
            signOptions: { expiresIn: '1h'}
        }),
        MailerModule.forRoot({
            transport: {
                host: 'smtp.mailtrap.io',
                port: 2525,
                auth: {
                    user: 'f009c6be1a075e',
                    pass: 'b96b964ff5ca99',
                },
            }
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, LocalStrategy, JwtStrategy, FortyTwoStrategy, PrismaService],
    exports: [AuthService]
})
export class AuthModule {}
