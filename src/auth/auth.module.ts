import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaService } from 'src/prisma.service';
import { UsersService } from 'src/users/users.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FortyTwoStrategy } from './strategy/42.strategy';
import { JwtStrategy } from './strategy/jwt.strategy';
import { LocalStrategy } from './strategy/local.strategy';

@Module({
    imports: [
        PassportModule,
    ],
    controllers: [AuthController],
    providers: [AuthService, LocalStrategy, UsersService, JwtService, JwtStrategy, FortyTwoStrategy, PrismaService],
    exports: [AuthService]
})
export class AuthModule {}
