import { Entity } from './Entity.entities';
import { Ball } from './Ball.entities';
import {
	randomNb,
	WIDTH,
	HEIGHT,
	BONUS_LIFETIME,
	X_BONUS_LIMIT,
	Y_BONUS_LIMIT,
	BONUS_WIDTH,
	BONUS_HEIGHT,
	SIZE_DECREASE_PATH,
	SIZE_INCREASE_PATH,
	REVERSE_KEYS_BONUS_PATH,
	SLOWER_BONUS_PATH,
	SNIPER_BONUS_PATH
}
from './utils.entities';
import { Server } from 'socket.io';

export class Bonus extends Entity {

	constructor(effect: string, spawningNb: number, gameId:string, _server: Server){
		super();
		this.effect = effect;
		this.spawningNb = spawningNb;
		this.gameId = gameId;
		this._server = _server;
		this.init();
	}
	effect: string;
	// image: HTMLImageElement;
	imagePath: string;
	spawningNb: number;
	lifetime: number = BONUS_LIFETIME;
	gameId: string;
	_server: Server;

	init()
	{
		switch (this.effect) {
			case 'SIZE_DECREASE':
				this.imagePath = SIZE_DECREASE_PATH;
				break;
			case 'SIZE_INCREASE':
				this.imagePath = SIZE_INCREASE_PATH;
				break;
			case 'REVERSE_KEYS_BONUS':
				this.imagePath = REVERSE_KEYS_BONUS_PATH;
				break;
			case 'SLOWER_BONUS':
				this.imagePath = SLOWER_BONUS_PATH;
				break;
			case 'SNIPER_BONUS':
				this.imagePath = SNIPER_BONUS_PATH;
				break;
		}
		this.height = BONUS_HEIGHT;
		this.width = BONUS_WIDTH;
	}



	sendBonusData(ball: Ball)
	{
		this.setRandBonusPos(ball);
		let bonusData = {
			name: this.effect,
			imgURL: this.imagePath,
			x: this.positionX,
			y: this.positionY,
			h: this.height,
			w: this.width
		}
		this._server.to(this.gameId).emit("bonus_spawn", bonusData);
	}

	// randomNb(min: number, max: number): number
	// {
	// 	let randomNumber:number = min + Math.random() * (max - min);
	// 	return (randomNumber);
	// }

	private randomY(min: number, max: number, ball: Ball): number
	{
		while (1)		// finds randomNumber for Y to not be on the ball's trajectory
		{
			let randomNumber: number = min + Math.random() * (max - min);
			if (ball.velocityX > 0)											// if ball goes right
			{
				if (((ball.velocityY > 0)))									// if ball goes down
				{
					if (this.positionX + BONUS_WIDTH >= ball.positionX)				// if BONUS is right of the ball
					{
						if (randomNumber + BONUS_HEIGHT < ball.positionY)	// if BONUS is not under the ball
							return (randomNumber as number);
						else if (BONUS_HEIGHT >= ball.positionY - Y_BONUS_LIMIT) // if BONUS cannot be above the ball
							this.positionX = randomNb(X_BONUS_LIMIT, ball.positionX - BONUS_WIDTH); // forces BONUS to be left of the ball
					}
					else													// if BONUS is left of the ball
						return (randomNumber as number);
				}
				else														// if ball goes up
				{
					if (this.positionX + BONUS_WIDTH >= ball.positionX)				// if BONUS is right of the ball
					{
						if (randomNumber > ball.positionY)					// if BONUS is not above the ball
							return (randomNumber as number);
						else if (BONUS_HEIGHT >= HEIGHT - Y_BONUS_LIMIT - ball.positionY) // if BONUS cannot be under the ball
							this.positionX = randomNb(X_BONUS_LIMIT, ball.positionX - BONUS_WIDTH); // forces BONUS to be left of the ball
					}
					else													// if BONUS is left of the ball
						return (randomNumber as number);
				}
			}
			else															// if ball goes left
			{
				if (((ball.velocityY > 0)))									// if ball goes down
				{
					if (this.positionX <= ball.positionX)							// if BONUS left of the ball
					{
						if (randomNumber + BONUS_HEIGHT < ball.positionY)	// if BONUS is not under the ball
							return (randomNumber as number);
						else if (BONUS_HEIGHT >= ball.positionY - Y_BONUS_LIMIT) // if BONUS cannot be above the ball
							this.positionX = randomNb(ball.positionX, (WIDTH - BONUS_WIDTH - X_BONUS_LIMIT)); // forces BONUS to be right of the ball
					}
					else													// if BONUS is right of the ball
						return (randomNumber as number);
				}
				else														// if ball goes up
				{
					if (this.positionX <= ball.positionX)							// if BONUS is left of the ball
					{
						if (randomNumber > ball.positionY)					// if BONUS is not above the ball
							return (randomNumber as number);
						else if (BONUS_HEIGHT >= HEIGHT - Y_BONUS_LIMIT - ball.positionY) // if BONUS cannot be under the ball
							this.positionX = randomNb(ball.positionX, (WIDTH - BONUS_WIDTH - X_BONUS_LIMIT)); // forces BONUS to be right of the ball
					}
					else													// if BONUS is right of the ball
						return (randomNumber as number);
				}
			}
		}
		return (0);
	}

	setRandBonusPos(ball: Ball)
	{
		this.positionX = randomNb((X_BONUS_LIMIT), (WIDTH - BONUS_WIDTH - X_BONUS_LIMIT));
		this.positionY  = this.randomY(Y_BONUS_LIMIT, HEIGHT - BONUS_HEIGHT - Y_BONUS_LIMIT, ball);
	}
}