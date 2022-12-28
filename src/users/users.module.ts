import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from 'src/prisma.service';
import { UsersGateway } from './users.gateway';

@Module({
    controllers: [UsersController],
    providers: [UsersService, PrismaService, UsersGateway],
    exports: [UsersService]
})
export class UsersModule {}
