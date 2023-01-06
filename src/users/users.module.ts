import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from 'src/prisma.service';
import { UsersGateway } from './users.gateway';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from 'src/auth/auth.service';

@Module({
    controllers: [UsersController],
    providers: [UsersService, PrismaService, AuthService, JwtService, UsersGateway],
    exports: [UsersService]
})
export class UsersModule {}
