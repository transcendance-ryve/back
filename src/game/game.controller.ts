import { Controller, UseGuards } from "@nestjs/common"
import { GameService } from "./game.service"
import { GetCurrentUser } from 'src/decorators/user.decorator';
import { JwtPayloadDto } from 'src/auth/dto/jwt-payload.dto';
import { Get } from '@nestjs/common';
import { Game } from "@prisma/client";
import { JwtAuthGuard } from 'src/users/guard/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('game')
export class GameController {
	constructor(
		private readonly _gameService: GameService
	){}

	@Get ('history')
	getGameHistory(
		@GetCurrentUser() currentUser: JwtPayloadDto,
	) {
		console.log(currentUser);
		return this._gameService.getGameHistory(currentUser.id);
	}

	@Get ('current')
	getCurrentGame(
	){
		return this._gameService.getCurrentGame();
	}
}