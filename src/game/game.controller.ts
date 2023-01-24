import {
	Controller,
	Param,
	UseGuards,
	Get,
	Query,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { JwtAuthGuard } from 'src/users/guard/jwt.guard';
import { JwtPayloadDto } from 'src/auth/dto/jwt-payload.dto';
import { GetCurrentUser } from 'src/decorators/user.decorator';
import GameService from './game.service';
import { MatchmakingService } from './matchmaking.service';

@UseGuards(JwtAuthGuard)
@Controller('game')
export default class GameController {
	constructor(
		// eslint-disable-next-line no-unused-vars
		private readonly _gameService: GameService,
		// eslint-disable-next-line no-unused-vars
		private readonly _matchmakingService: MatchmakingService,
		// eslint-disable-next-line no-unused-vars
		private readonly _userService: UsersService,
	// eslint-disable-next-line no-empty-function
	) {}

	@Get('game_requests')
	async getGameRequests(
		@GetCurrentUser() currentUser: JwtPayloadDto,
	) {
		const gameRequests = this._matchmakingService.getGameRequests(currentUser.id, false);

		const requests = await Promise.all(gameRequests.map(async (gameRequest) => {
			const user = await this._userService.getUser({ id: gameRequest.sender }, 'id,username,avatar,status');
			return {
				id: user.id,
				username: user.username,
				avatar: user.avatar,
				status: user.status,
				bonus: gameRequest.bonus,
				timeup: gameRequest.timeup,
				startTime: gameRequest.startTime,
			};
		}));
		return requests;
	}

	@Get('playerGame/:userId')
	async getPlayerGame(
		@Param('userId') userId: string,
	) : Promise<string | null> {
		const game: string | null = await this._gameService.getPlayerGame(userId);
		return game;
	}

	@Get('history/:userId')
	async getGameHistory(
		@Param('userId') userId: string,
		@Query('search') search: string,
		@Query('page') page: string,
		@Query('take') take: string,
		@Query('order') order: string,
	) {
		const games = await this._gameService.getGameHistory(
			userId,
			search || undefined,
			order,
			Number(page) || undefined,
			Number(take) || undefined,
		);
		return games;
	}

	@Get('current')
	getCurrentGame(
		@Query('order') order: string,
		@Query('page') page: number,
		@Query('take') take: number,
		@Query('search') search: string,
	) {
		return this._gameService.getCurrentGame(
			order,
			page,
			take,
			search || undefined,
		);
	}
}
