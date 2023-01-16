import { Entity } from "./Entity.entities";
import {
	color,
	HEIGHT,
	PLAYERS_HEIGHT,
	PLAYERS_SPEED,
	PLAYERS_WIDTH,
	WIDTH
} from "./utils.entities";

export class Paddle extends Entity
{
	constructor(color: string)
	{
		super();
		this.color = color;
		this.init();
	};

	public color: string;
	private speed: number = PLAYERS_SPEED;

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

	keyPressed = {
		W: false,
		S: false
	}

	standardKeysBehavior() {
		if (this.keyPressed.W)
		{
			if (this.positionY > 2 && (this.positionY - this.speed) >= 2)
				this.positionY -= this.speed;
			else
				this.positionY = 2;
		}
		if (this.keyPressed.S)
		{
			if (this.positionY < HEIGHT - this.height && (this.positionY + this.speed)  <= HEIGHT - this.height)
				this.positionY += this.speed;
			else
			this.positionY = HEIGHT - this.height - 2
		}
	}
	// moveUp();
	// moveDown();
	// update();
}