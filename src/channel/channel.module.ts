import { Module } from '@nestjs/common';
import { UsersModule } from 'src/users/users.module';
import { ChannelController } from './channel.controller';
import { ChannelGateway } from './channel.gateway';
import { ChannelService } from './channel.service';
import { PrismaService } from 'src/prisma.service';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
@Module({
	controllers: [ChannelController],
	providers: [ChannelService, ChannelGateway, PrismaService, UsersService, JwtService],
})
export class ChannelModule {}
