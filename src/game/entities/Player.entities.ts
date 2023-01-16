import { Paddle } from './Paddle.entities';
import { gameStatus, playerStatus } from './utils.entities';

export class Player
{
	constructor(playerID: string, color: string)
	{
		this.id = playerID;
		this.color = color;
		this.pad = new Paddle(this.color);
	}

	id: string;
	color: string;
	gameStatus: string = gameStatus.inGame;
	playerStatus: string = playerStatus.connected;
	score: number = 0;
	bonuses: boolean[] = [
		false,
		false,
		false,
		false,
		false
	];
	penalties: boolean[] = [
		false,
		false,
		false,
		false,
		false
	];

	pad: Paddle;
}