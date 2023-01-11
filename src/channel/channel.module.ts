import { Module } from '@nestjs/common';
import { UsersModule } from 'src/users/users.module';
import { ChannelController } from './channel.controller';
import { ChannelGateway } from './channel.gateway';
import { ChannelService } from './channel.service';
import { PrismaService } from 'src/prisma.service';
import { UsersService } from 'src/users/users.service';

@Module({
	controllers: [ChannelController],
	providers: [ChannelService, ChannelGateway, PrismaService, UsersService],
})
export class ChannelModule {}
