import { Entity } from "./Entity.entities";
import {
	color,
	HEIGHT,
	PLAYERS_HEIGHT,
	PLAYERS_SPEED,
	PLAYERS_WIDTH,
	WIDTH,
	PLAYER_TO_BORDER_GAP
} from "./utils.entities";
import { Pong } from "./neoPong.entities"

export class Paddle extends Entity
{
	constructor(color: string)
	{
		super();
		this.color = color;
		this.init();
	};

	public color: string;
	public speed: number = PLAYERS_SPEED;
	public playerSpeedSlowered = false;
	public increased = false;
	public decreased = false;
	public counterIncreaseEffect = false;
	public counterDecreaseEffect = false;

	keyPressed = {
		W: false,
		S: false
	}

	private init()
	{
		if (this.color === color.blue)
			this.positionX = 10;
		else if (this.color === color.red)
			this.positionX = WIDTH - (10 + PLAYERS_WIDTH);

		this.height = PLAYERS_HEIGHT;
		this.width = PLAYERS_WIDTH;
		this.positionY = HEIGHT / 2 - PLAYERS_HEIGHT / 2;
		this.speed = PLAYERS_SPEED;
	}

	moveUp()
	{
		if (this.positionY > PLAYER_TO_BORDER_GAP && (this.positionY - this.speed) >= PLAYER_TO_BORDER_GAP)
			this.positionY -= this.speed;
		else
			this.positionY = PLAYER_TO_BORDER_GAP;
	}

	moveDown()
	{
		if (this.positionY < HEIGHT - this.height - PLAYER_TO_BORDER_GAP && (this.positionY + this.speed)  <= HEIGHT - this.height - PLAYER_TO_BORDER_GAP)
			this.positionY += this.speed;
		else
			this.positionY = HEIGHT - this.height - PLAYER_TO_BORDER_GAP
	}

	standardKeysBehavior()
	{
		if (this.keyPressed.W)
			this.moveUp();
		if (this.keyPressed.S)
			this.moveDown();
	}

	reverseKeysBehavior()
	{
		if (this.keyPressed.W)
			this.moveDown();
		if (this.keyPressed.S)
			this.moveUp();
	}

	slowerPlayerSpeed(pong: Pong)
	{
		if (pong.caughtBy[pong.SLOWER_BONUS] == 'R' && this.color == color.blue)
			this.speed *= 0.7;
		if (pong.caughtBy[pong.SLOWER_BONUS] == 'L' && this.color == color.red)
			this.speed *= 0.7;
	}

	update(pong: Pong)
	{
		if (pong.bonusCaught[pong.SLOWER_BONUS] && !this.playerSpeedSlowered)
		{
			this.playerSpeedSlowered = true;
			this.slowerPlayerSpeed(pong);
		}
		if (pong.caughtBy[pong.REVERSE_KEYS_BONUS] == 'R' && this.color == color.blue)
			this.reverseKeysBehavior();
		else if (pong.caughtBy[pong.REVERSE_KEYS_BONUS] == 'L' && this.color == color.red)
			this.reverseKeysBehavior();
		else
			this.standardKeysBehavior();
	}
}