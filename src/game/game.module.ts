import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { UsersModule } from 'src/users/users.module';
import GameController from './game.controller';
import GameGateway from './game.gateway';
import GameService from './game.service';
import { MatchmakingService } from './matchmaking.service';

@Module({
	imports: [
		UsersModule,
	],
	controllers: [GameController],
	providers: [GameService, MatchmakingService, PrismaService, GameGateway],
	exports: [GameService],
})
export default class GameModule {}
