import { Entity } from './Entity.entities';
import {
	color,
	randomNb,
	WIDTH,
	HEIGHT,
	START_BALL_SPEED,
	START_BALL_RADIUS,
	BALL_SPEED_UP_EFFECT,
	BALL_SLOW_DOWN_EFFECT,
	MAX_BALL_SPEED,
	BALL_SPEED_MULTIPLIER,
} from './utils.entities';
import { Player } from './Player.entities';

export class Ball extends Entity
{
	constructor()
	{
		super();
		this.init();
	}

	velocityX: number;
	velocityY: number;
	color: string;
	lastPlayerTouchingBall: string;
	speed: number;
	radius: number;
	activated: boolean = true;
	hits: number = 0;

	saveState = {
		copyVelX: 0,
		copyVelY: 0
	}

	vel = {
		x: 0,
		y: 0
	}

	blue = {
		color: color.blue,
		velocity: this.vel
	}

	red = {
		color: color.red,
		velocity: this.vel
	}

	sides = [
		this.blue,
		this.red
	]

	generateRandDirection()
	{
		if (randomNb(0, 1) > 0.5)
			this.velocityX = -this.velocityX;
		if (randomNb(0, 1) > 0.5)
			this.velocityY = -this.velocityY;
		if (this.velocityX < 0)
			this.color = color.red;
		else
			this.color = color.blue;
	};

	init()
	{
		// this.height = 
		// this.width =
		this.positionX = WIDTH / 2 - START_BALL_RADIUS / 2;
		this.positionY = HEIGHT / 2 - START_BALL_RADIUS / 2;
		this.velocityX = START_BALL_SPEED;
		this.velocityY = START_BALL_SPEED;
		this.radius = START_BALL_RADIUS;
		this.generateRandDirection();

	};

	resetBallVel(): void
	{
		this.velocityX = this.saveState.copyVelX; // ancienne version -> this.velocityX = -this.saveState.copyVelX;
	
		// makes the ball fall down after sniper shot
		if (this.saveState.copyVelY > 0)
			this.velocityY = this.saveState.copyVelY;
		else if (this.saveState.copyVelY < 0)
			this.velocityY = -this.saveState.copyVelY;
	
		this.saveState.copyVelX = 0;
		this.saveState.copyVelY = 0;
	};

	resetBall = function () {
		// centers the ball
		this.positionX = WIDTH / 2 - START_BALL_RADIUS / 2
		this.positionY = HEIGHT / 2 - START_BALL_RADIUS / 2
	
		// saves the direction
		let velocityX = this.velocityX
	
		// makes the freeze
		this.velocityX = 0
		this.velocityY = 0
	
		//this.ballFreezed = true; // prevent bonuses from being displayed while the is reset
	
		// gives ball a new direction
		setTimeout(() => {
			if (velocityX < 0) {
				this.velocityX = -START_BALL_SPEED
				this.velocityY = START_BALL_SPEED
				if (randomNb(0, 1) > 0.5)
					this.velocityY = -this.velocityY;
			}
			else {
				this.velocityX = START_BALL_SPEED
				this.velocityY = START_BALL_SPEED
				if (randomNb(0, 1) > 0.5)
					this.velocityY = -this.velocityY;
			}
			//if (this.ballFreezed)
			//	this.start = Date.now();
			//this.ballFreezed = false;
			//this.playerIncreased = false;
			//this.playerDecreased = false;
		}, 1000)
	}

	private updateBallPos()
	{
		this.positionX += this.velocityX;
		this.positionY += this.velocityY;
	}

	private increaseBallSpeed = function()
	{
		if (this.hits === 1)
		{
			this.hits = 0
			if (Math.abs(this.velocityX) < MAX_BALL_SPEED)
			{
				this.velocityX *= BALL_SPEED_MULTIPLIER
				this.velocityY *= BALL_SPEED_MULTIPLIER
			}
		}
	}

	private collisionTimeLag = function()
	{
		this.activated = false
		setTimeout(() => {
			this.activated = true
		}, 800)
	}

	toggleColor(): void
	{
		if (this.color === color.red)
			this.color = color.blue;
		else if (this.color === color.blue)
			this.color = color.red;
	};

	private makeBallBounce(leftPlayer: Player, rightPlayer: Player)
	{
		if (this.velocityX < 0)
		{
			if (leftPlayer.pad.keyPressed.W && Math.abs(this.velocityX) * BALL_SPEED_UP_EFFECT <= MAX_BALL_SPEED && this.velocityY < 0)
				this.velocityX = -this.velocityX * BALL_SPEED_UP_EFFECT
			else if (leftPlayer.pad.keyPressed.W && Math.abs(this.velocityX) * BALL_SLOW_DOWN_EFFECT >= START_BALL_SPEED && this.velocityY > 0)
				this.velocityX = -this.velocityX * BALL_SLOW_DOWN_EFFECT
			else if (leftPlayer.pad.keyPressed.S && Math.abs(this.velocityX) * BALL_SPEED_UP_EFFECT <= MAX_BALL_SPEED && this.velocityY > 0)
				this.velocityX = -this.velocityX * BALL_SPEED_UP_EFFECT
			else if (leftPlayer.pad.keyPressed.S && Math.abs(this.velocityX) * BALL_SLOW_DOWN_EFFECT >= START_BALL_SPEED && this.velocityY < 0)
				this.velocityX = -this.velocityX * BALL_SLOW_DOWN_EFFECT
			else
				this.velocityX = -this.velocityX // no effect
		}		
		else if (this.velocityX > 0)	
		{
			if (rightPlayer.pad.keyPressed.W && Math.abs(this.velocityX) * BALL_SPEED_UP_EFFECT <= MAX_BALL_SPEED && this.velocityY < 0)
				this.velocityX = -this.velocityX * BALL_SPEED_UP_EFFECT
			else if (rightPlayer.pad.keyPressed.W && Math.abs(this.velocityX) * BALL_SLOW_DOWN_EFFECT >= START_BALL_SPEED && this.velocityY > 0)
				this.velocityX = -this.velocityX * BALL_SLOW_DOWN_EFFECT
			else if (rightPlayer.pad.keyPressed.S && Math.abs(this.velocityX) * BALL_SPEED_UP_EFFECT <= MAX_BALL_SPEED && this.velocityY > 0)
				this.velocityX = -this.velocityX * BALL_SPEED_UP_EFFECT
			else if (rightPlayer.pad.keyPressed.S && Math.abs(this.velocityX) * BALL_SLOW_DOWN_EFFECT >= START_BALL_SPEED && this.velocityY < 0)
				this.velocityX = -this.velocityX * BALL_SLOW_DOWN_EFFECT
			else
				this.velocityX = -this.velocityX // no effect
		}	
	}

	private handleBallCollisions(leftPlayer: Player, rightPlayer: Player): void
	{
		if ((this.positionY + this.radius) >= HEIGHT || (this.positionY - this.radius) <= 0)
			this.velocityY = -this.velocityY;

		if ((this.positionX + this.radius >= WIDTH - (rightPlayer.pad.width + 10) &&
		(this.positionY >= rightPlayer.pad.positionY && this.positionY <= rightPlayer.pad.positionY + rightPlayer.pad.height)) ||
		(this.positionX - this.radius <= (leftPlayer.pad.width + 10) &&
		(this.positionY >= leftPlayer.pad.positionY && this.positionY <= leftPlayer.pad.positionY + leftPlayer.pad.height)))
		{
			if (this.activated)
			{
				this.hits++;
				/*if (this.throwSniperShot && ((this.ball.velocityX > 0 && this.caughtBy[SNIPER_BONUS] == 'R') || (this.ball.velocityX < 0 && this.caughtBy[SNIPER_BONUS] == 'L')))
				{
					this.copyBall();
					this.sniperShot();
					this.throwSniperShot = false;
				}
				else
				{
					if (this.ballCopy.dataCopied)
						this.giveBallPreviousData();*/
					this.makeBallBounce(leftPlayer, rightPlayer);
					this.toggleColor();
				//}
			}
			this.collisionTimeLag();
		}
		this.increaseBallSpeed();
	}

	update(leftPlayer: Player, rightPlayer: Player): void
	{
		this.handleBallCollisions(leftPlayer, rightPlayer);
		this.updateBallPos();
	}
}