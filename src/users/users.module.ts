import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from 'src/prisma.service';
import { UsersGateway } from './users.gateway';
import { JwtService } from '@nestjs/jwt';
import { JwtStrategy } from 'src/auth/strategy/jwt.strategy';

@Module({
    controllers: [UsersController],
    providers: [UsersService, PrismaService, JwtStrategy, UsersGateway],
    exports: [UsersService]
})
export class UsersModule {}
