import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import ChannelController from './channel.controller';
import ChannelGateway from './channel.gateway';
import ChannelService from './channel.service';

@Module({
	controllers: [ChannelController],
	providers: [ChannelService, ChannelGateway, PrismaService, UsersService, JwtService],
})
export default class ChannelModule {}
