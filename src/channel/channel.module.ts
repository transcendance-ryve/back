import { Module } from '@nestjs/common';
import { UsersModule } from 'src/users/users.module';
import { ChannelController } from './channel.controller';
import { ChannelGateway } from './channel.gateway';
import { ChannelService } from './channel.service';
import { PrismaService } from 'src/prisma.service';

@Module({
	controllers: [ChannelController],
	providers: [ChannelService, ChannelGateway, PrismaService],
	imports: [UsersModule],
})
export class ChannelModule {}
