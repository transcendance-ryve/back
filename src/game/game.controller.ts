import { Controller, UseGuards } from "@nestjs/common"
import { GameService } from "./game.service"
import { GetCurrentUser } from 'src/decorators/user.decorator';
import { JwtPayloadDto } from 'src/auth/dto/jwt-payload.dto';
import { Get, Query } from '@nestjs/common';
import { Game } from "@prisma/client";
import { JwtAuthGuard } from 'src/users/guard/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('game')
export class GameController {
	constructor(
		private readonly _gameService: GameService
	){}

	@Get ('history')
	async getGameHistory(
		@GetCurrentUser() currentUser: JwtPayloadDto,
		@Query('search') search: string,
		@Query('page') page: string,
		@Query('take') take: string,
		@Query('order') order: string,
	) {
		const games = await this._gameService.getGameHistory(currentUser.id,
			search || undefined,
			order,
			Number(page) || undefined,
			Number(take) || undefined,);
		const count = await this._gameService.getGameHistoryCount(currentUser.id);
		return {games, count};
	}

	@Get('current')
	getCurrentGame(
	){
		return this._gameService.getCurrentGame();
	}
}