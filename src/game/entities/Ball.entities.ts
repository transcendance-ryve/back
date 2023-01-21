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
import { runInThisContext } from 'vm';

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
	paddleCollisionsActivated: boolean = true;
	// for tests
	// wallCollisionsActivated: boolean = true;
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

	generateRandDirectionAndTrajectory()
	{
		if (randomNb(0, 1) > 0.5)
			this.velocityX = -this.velocityX;
		if (randomNb(0, 1) > 0.5)
			this.velocityY = -this.velocityY;
		if (this.velocityX < 0)
			this.color = color.red;
		else
			this.color = color.blue;

		// gives ball a random trajectory
		this.velocityY = randomNb(0, 1) * this.velocityY;
	};
 
	private init()
	{
		this.positionX = WIDTH / 2;
		this.positionY = HEIGHT / 2;
		this.velocityX = START_BALL_SPEED;
		this.velocityY = START_BALL_SPEED;
		this.radius = START_BALL_RADIUS;
		this.generateRandDirectionAndTrajectory();
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
				// gives ball random trajectory
				if (randomNb(0, 1) > 0.5)
					this.velocityY = -this.velocityY;
			}
			else {
				this.velocityX = START_BALL_SPEED;
				this.velocityY = START_BALL_SPEED;
				// gives ball random trajectory
				if (randomNb(0, 1) > 0.5)
					this.velocityY = -this.velocityY;
			}
			this.velocityY = randomNb(0, 1) * this.velocityY;
			// for tests
			// if (this.velocityY < 0)
			// 	this.velocityY = -this.velocityY;
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

	private increaseBallSpeed()
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

	private collisionTimeLag()
	{
		this.paddleCollisionsActivated = false
		setTimeout(() => {
			this.paddleCollisionsActivated = true
		}, 400)
	}

	private toggleColor(): void
	{
		if (this.color === color.red)
			this.color = color.blue;
		else if (this.color === color.blue)
			this.color = color.red;
	};

	calculateBallTrajectory(player: Player): number
	{
		let a: number = player.pad.height / 2; // c'est le max de l'échelle
		let b: number = player.pad.positionY + a; // c'est le point 0 (le milieu du pad)
		let c: number = b - this.positionY; // c'est le point d'impact de la balle sur le pad
		let d: number = c / a; // c'est le pourcentage
		let e: number = d * this.velocityX;
		return (e);
	}

	newBallBouncing(player: Player)
	{
		// reverses ball direction
		this.velocityX = -this.velocityX;

		// if ball hits the paddle's upper part
		if (this.positionY >= player.pad.positionY 
			&& this.positionY <= player.pad.positionY + (player.pad.height / 2))
			this.velocityY = this.calculateBallTrajectory(player);
		
		// if ball hits the paddle's bottom part
		else if (this.positionY > player.pad.positionY + (player.pad.height / 2)
			&& this.positionY <= player.pad.positionY + player.pad.height)
			this.velocityY = this.calculateBallTrajectory(player);
		if (this.velocityX > 0)
			this.velocityY = -this.velocityY;
	}

	private makeBallBounce(leftPlayer: Player, rightPlayer: Player, pong: Pong)
	{
		if (this.velocityX < 0)
			this.newBallBouncing(leftPlayer);
		else if (this.velocityX > 0)
			this.newBallBouncing(rightPlayer);
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

	// for tests
	// private collisionTimeLag2()
	// {
	// 	this.wallCollisionsActivated = false
	// 	setTimeout(() => {
	// 		this.wallCollisionsActivated = true
	// 	}, 1000)
	// }

	private handleBallCollisions(leftPlayer: Player, rightPlayer: Player, throwSniperShot: boolean, caughtBy: string, pong: Pong): void
	{
		if ((this.positionY + this.radius) >= HEIGHT || (this.positionY - this.radius) <= 0)
		{
			// for tests
			// if (this.wallCollisionsActivated)		
			{
				// console.log("entrée Y\nVelY = ", this.velocityY)
				this.velocityY = -this.velocityY;
				// console.log("sortie Y\nVelY = ", this.velocityY)
				// console.log("ball radius = ", this.radius);
			}
			// for tests
			// this.collisionTimeLag2();
		}
		
		if ((this.positionX + this.radius >= WIDTH - (rightPlayer.pad.width + 10) &&
		(this.positionY >= rightPlayer.pad.positionY && this.positionY <= rightPlayer.pad.positionY + rightPlayer.pad.height)) ||
		(this.positionX - this.radius <= (leftPlayer.pad.width + 10) &&
		(this.positionY >= leftPlayer.pad.positionY && this.positionY <= leftPlayer.pad.positionY + leftPlayer.pad.height)))
		{
			//console.log("passage paddle hit")
			if (this.paddleCollisionsActivated)
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
			
			// for tests
			// in case the ball touched the top or bottom wall before touching the ball
			// and is gonna touch the paddle again, wall collsions must be activated
			// this.wallCollisionsActivated = true;
		}
		this.increaseBallSpeed();
		//console.log("check ball vey Y = ", this.velocityY)
	}

	
	update(leftPlayer: Player, rightPlayer: Player, throwSniperShot: boolean, caughtBy: string, pong: Pong): void
	{
		this.handleBallCollisions(leftPlayer, rightPlayer, throwSniperShot, caughtBy, pong);
		this.updateBallPos();
	}
}