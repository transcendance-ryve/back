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
	SNIPER_SPEED_UP_EFFECT_X,
	SNIPER_SPEED_UP_EFFECT_Y
} from './utils.entities';
import { Player } from './Player.entities';
import { Pong } from './neoPong.entities';
import { Bonus } from './Bonus.entities';

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
	ballFreezed = false;

	saveState = {
		copyVelX: 0,
		copyVelY: 0,
		dataSaved: false
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

	saveBallState()
	{
		this.saveState.copyVelX = this.velocityX;
		this.saveState.copyVelY = this.velocityY;
		this.saveState.dataSaved = true;
	}

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


		// for testing
		this.velocityX = START_BALL_SPEED;
		this.velocityY = START_BALL_SPEED;
	};

	private init()
	{
		this.positionX = WIDTH / 2 - START_BALL_RADIUS / 2;
		this.positionY = HEIGHT / 2 - START_BALL_RADIUS / 2;
		this.velocityX = START_BALL_SPEED;
		this.velocityY = START_BALL_SPEED;
		this.radius = START_BALL_RADIUS;
		this.generateRandDirection();
	};

	private resetBallState(): void
	{
		this.velocityX = -this.saveState.copyVelX;
	
		// makes the ball fall down after sniper shot
		if (this.saveState.copyVelY > 0)
			this.velocityY = this.saveState.copyVelY;
		else if (this.saveState.copyVelY < 0)
			this.velocityY = -this.saveState.copyVelY;
		this.saveState.copyVelX = 0;
		this.saveState.copyVelY = 0;
		this.saveState.dataSaved = false;
	};

	isFreezed(): boolean
	{
		return (this.ballFreezed);
	}
	
	resetBall(pong: Pong) {
		// centers the ball
		this.positionX = WIDTH / 2;
		this.positionY = HEIGHT / 2;
	
		// saves the direction
		let velocityX = this.velocityX;
	
		// makes the freeze
		this.velocityX = 0;
		this.velocityY = 0;
	
		this.ballFreezed = true; // prevent bonuses from being displayed while the ball is reset

		// gives ball a new direction
		setTimeout(() => {
			if (velocityX < 0) {
				this.velocityX = -START_BALL_SPEED;
				this.velocityY = START_BALL_SPEED;
				if (randomNb(0, 1) > 0.5)
					this.velocityY = -this.velocityY;
			}
			else {
				this.velocityX = START_BALL_SPEED;
				this.velocityY = START_BALL_SPEED;
				if (randomNb(0, 1) > 0.5)
					this.velocityY = -this.velocityY;
			}
			this.ballFreezed = false;
			pong.playerIncreased = false;
			pong.playerDecreased = false;
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
		}, 400)
	}

	private toggleColor(): void
	{
		if (this.color === color.red)
			this.color = color.blue;
		else if (this.color === color.blue)
			this.color = color.red;
	};

	private standardBouncing(player: Player)
	{
		if (player.pad.keyPressed.W && Math.abs(this.velocityX) * BALL_SPEED_UP_EFFECT <= MAX_BALL_SPEED && this.velocityY < 0)
			this.velocityX = -this.velocityX * BALL_SPEED_UP_EFFECT
		else if (player.pad.keyPressed.W && Math.abs(this.velocityX) * BALL_SLOW_DOWN_EFFECT >= START_BALL_SPEED && this.velocityY > 0)
			this.velocityX = -this.velocityX * BALL_SLOW_DOWN_EFFECT
		else if (player.pad.keyPressed.S && Math.abs(this.velocityX) * BALL_SPEED_UP_EFFECT <= MAX_BALL_SPEED && this.velocityY > 0)
			this.velocityX = -this.velocityX * BALL_SPEED_UP_EFFECT
		else if (player.pad.keyPressed.S && Math.abs(this.velocityX) * BALL_SLOW_DOWN_EFFECT >= START_BALL_SPEED && this.velocityY < 0)
			this.velocityX = -this.velocityX * BALL_SLOW_DOWN_EFFECT
		else
			this.velocityX = -this.velocityX // no effect
	}

	private reverseBouncing(player: Player)
	{
			if (player.pad.keyPressed.S && Math.abs(this.velocityX) * BALL_SPEED_UP_EFFECT <= MAX_BALL_SPEED && this.velocityY < 0)
				this.velocityX = -this.velocityX * BALL_SPEED_UP_EFFECT
			else if (player.pad.keyPressed.S && Math.abs(this.velocityX) * BALL_SLOW_DOWN_EFFECT >= START_BALL_SPEED && this.velocityY > 0)
				this.velocityX = -this.velocityX * BALL_SLOW_DOWN_EFFECT
			else if (player.pad.keyPressed.W && Math.abs(this.velocityX) * BALL_SPEED_UP_EFFECT <= MAX_BALL_SPEED && this.velocityY > 0)
				this.velocityX = -this.velocityX * BALL_SPEED_UP_EFFECT
			else if (player.pad.keyPressed.W && Math.abs(this.velocityX) * BALL_SLOW_DOWN_EFFECT >= START_BALL_SPEED && this.velocityY < 0)
				this.velocityX = -this.velocityX * BALL_SLOW_DOWN_EFFECT			
			else
				this.velocityX = -this.velocityX // no effect
	}

	private makeBallBounce(leftPlayer: Player, rightPlayer: Player, pong: Pong)
	{
		if (!pong.bonusCaught[pong.REVERSE_KEYS_BONUS])
		{
			if (this.velocityX < 0)
				this.standardBouncing(leftPlayer);
			else if (this.velocityX > 0)
				this.standardBouncing(rightPlayer);
		}
		else if (pong.caughtBy[pong.REVERSE_KEYS_BONUS] === 'R')
			this.reverseBouncing(leftPlayer);
		else if (pong.caughtBy[pong.REVERSE_KEYS_BONUS] === 'L')
			this.reverseBouncing(rightPlayer);
	}

	private triggerSniperShot(player: Player)
	{
		if (player.pad.keyPressed.W)
		{
			if (this.velocityX > 0)
				this.velocityX = -SNIPER_SPEED_UP_EFFECT_X
			else
				this.velocityX = SNIPER_SPEED_UP_EFFECT_X
			this.velocityY = -SNIPER_SPEED_UP_EFFECT_Y

		}
		else if (player.pad.keyPressed.S)
		{
			if (this.velocityX > 0)
				this.velocityX = -SNIPER_SPEED_UP_EFFECT_X
			else
				this.velocityX = SNIPER_SPEED_UP_EFFECT_X
			this.velocityY = SNIPER_SPEED_UP_EFFECT_Y
		}
		else
		{
			if (this.velocityX > 0)
				this.velocityX = -SNIPER_SPEED_UP_EFFECT_X
			else
				this.velocityX = SNIPER_SPEED_UP_EFFECT_X
			this.velocityY = 0
		}
	}

	private sniperShot(leftPlayer: Player, rightPlayer: Player, pong: Pong)
	{
		if (this.velocityX < 0)
			this.triggerSniperShot(leftPlayer);
		else if (this.velocityX > 0)
			this.triggerSniperShot(rightPlayer);
		this.toggleColor();
	}

	
	private handleBallCollisions(leftPlayer: Player, rightPlayer: Player, throwSniperShot: boolean, caughtBy: string, pong: Pong): void
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
				if (pong.throwSniperShot && ((this.velocityX > 0 && caughtBy === 'R') || (this.velocityX < 0 && caughtBy === 'L')))
				{
					this.saveBallState();
					this.sniperShot(leftPlayer, rightPlayer, pong);
					pong.throwSniperShot = false;

				}
				else
				{
					if (this.saveState.dataSaved)
						this.resetBallState();
					this.makeBallBounce(leftPlayer, rightPlayer, pong);
					this.toggleColor();
				}
			}
			this.collisionTimeLag();
		}
		this.increaseBallSpeed();
	}

	
	update(leftPlayer: Player, rightPlayer: Player, throwSniperShot: boolean, caughtBy: string, pong: Pong): void
	{
		this.handleBallCollisions(leftPlayer, rightPlayer, throwSniperShot, caughtBy, pong);
		this.updateBallPos();
	}
}