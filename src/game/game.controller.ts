import { Controller, UseGuards } from "@nestjs/common"
import { GameService } from "./game.service"
import { GetCurrentUser } from 'src/decorators/user.decorator';
import { JwtPayloadDto } from 'src/auth/dto/jwt-payload.dto';
import { Get, Query } from '@nestjs/common';
import { JwtAuthGuard } from 'src/users/guard/jwt.guard';
import { MatchmakingService } from "./matchmaking.service";
import { UsersService } from "src/users/users.service";

@UseGuards(JwtAuthGuard)
@Controller('game')
export class GameController {
	constructor(
		private readonly _gameService: GameService,
		private readonly _matchmakingService: MatchmakingService,
		private readonly _userService: UsersService,
	){}

	@Get('game_requests')
	async getGameRequests(
		@GetCurrentUser() currentUser: JwtPayloadDto,
	){
		const gameRequests = this._matchmakingService.getGameRequests(currentUser.id, false);
		
		const requests = await Promise.all(gameRequests.map(async gameRequest => {
			const user = await this._userService.getUser({ id: gameRequest.sender }, "id,username,avatar,status");
			return {
				id: user.id,
				username: user.username,
				avatar: user.avatar,
				status: user.status,
				bonus: gameRequest.bonus,
				startTime: gameRequest.startTime,
			}
		}));

		return requests;
	}

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
		@Query('order') order: string,
		@Query('page') page: number,
		@Query('take') take: number,
		@Query('search') search: string,
	){
		return this._gameService.getCurrentGame(
			order,
			page,
			take,
			search || undefined
		);
	}
}