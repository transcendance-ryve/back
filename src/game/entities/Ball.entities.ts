import { Entity } from './Entity.entities';
import {
	color,
	randomNb,
	WIDTH,
	HEIGHT,
	START_BALL_SPEED,
	START_BALL_RADIUS,
	MAX_BALL_SPEED,
	BALL_SPEED_MULTIPLIER,
	SNIPER_SPEED_UP_EFFECT_X,
	SNIPER_SPEED_UP_EFFECT_Y,
	NB_BONUS
} 
from './utils.entities';
import { Player } from './Player.entities';
import { Pong } from './neoPong.entities';
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
	wallCollisionsActivated: boolean = true;
	hits: number = 0;
	hitsBeforeSpeedIncrease: number = 3;
	ballFreezed = false;

	saveState = {
		copyVelX: 0,
		copyVelY: 0,
		dataSaved: false
	}

	isFreezed(): boolean
	{
		return (this.ballFreezed);
	}

	public resetBall(pong: Pong) {
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

	private handleBallInBonusArea(pong: Pong)
	{
		for (let i = 0; i < NB_BONUS; i++)
		{
			if (pong.displayBonus[i] && pong.randBonusPosSet[i] && ((pong.ball.positionY) >= pong.mapBonus.get(i).positionY
				&& (pong.ball.positionY) <= (pong.mapBonus.get(i).positionY + pong.mapBonus.get(i).height))
				&& ((pong.ball.positionX) >= pong.mapBonus.get(i).positionX
				&& (pong.ball.positionX) <= (pong.mapBonus.get(i).positionX + pong.mapBonus.get(i).width)))
			{
				pong.bonusCaught[i] = true;
				if (pong.ball.velocityX > 0)
					pong.caughtBy[i] = 'L';
				else if (pong.ball.velocityX < 0)
					pong.caughtBy[i] = 'R';
				if (i == pong.SNIPER_BONUS)
					pong.throwSniperShot = true;
			}
		}
		if (pong.bonusCaught[pong.SIZE_INCREASE])
			pong.increasePlayerSize();
		if (pong.bonusCaught[pong.SIZE_DECREASE])
			pong.decreasePlayerSize();
	}

	private increaseBallSpeed()
	{
		if (this.hits === this.hitsBeforeSpeedIncrease)
		{
			this.hits = 0
			if (Math.abs(this.velocityX) < MAX_BALL_SPEED)
			{
				this.velocityX *= BALL_SPEED_MULTIPLIER
				this.velocityY *= BALL_SPEED_MULTIPLIER
			}
		}
	}

	private paddlesCollisionTimeLag()
	{
		this.paddleCollisionsActivated = false
		setTimeout(() => {
			this.paddleCollisionsActivated = true
		}, 400)
	}

	calculateBallTrajectory(player: Player): number
	{
		let midPad: number = player.pad.height / 2;
		let midPadPos: number = player.pad.positionY + midPad;
		let impactSpot: number = midPadPos - this.positionY;
		let ratio: number = impactSpot / midPad;
		let trajectory: number = ratio * this.velocityX;
		return (trajectory);
	}

	makeBallBounce(player: Player)
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

	private resetBallState(): void
	{
		this.velocityX = -this.saveState.copyVelX;
		this.velocityY = this.saveState.copyVelY;
		this.saveState.copyVelX = 0;
		this.saveState.copyVelY = 0;
		this.saveState.dataSaved = false;
	};

	private toggleColor(): void
	{
		if (this.color === color.red)
			this.color = color.blue;
		else if (this.color === color.blue)
			this.color = color.red;
	};

	private straightSniperShot()
	{
		if (this.velocityX > 0)
			this.velocityX = -SNIPER_SPEED_UP_EFFECT_X
		else
			this.velocityX = SNIPER_SPEED_UP_EFFECT_X
		this.velocityY = 0
	}

	private sniperShotGoesDown()
	{
		if (this.velocityX > 0)
			this.velocityX = -SNIPER_SPEED_UP_EFFECT_X
		else
			this.velocityX = SNIPER_SPEED_UP_EFFECT_X
		this.velocityY = SNIPER_SPEED_UP_EFFECT_Y
	}

	private sniperShotGoesUp()
	{
		if (this.velocityX > 0)
			this.velocityX = -SNIPER_SPEED_UP_EFFECT_X
		else
			this.velocityX = SNIPER_SPEED_UP_EFFECT_X
		this.velocityY = -SNIPER_SPEED_UP_EFFECT_Y
	}

	private triggerSniperShot(player: Player, pong: Pong)
	{
		if (!pong.bonusCaught[pong.REVERSE_KEYS_BONUS])
		{
			if (player.pad.keyPressed.W)
				this.sniperShotGoesUp();
			else if (player.pad.keyPressed.S)
				this.sniperShotGoesDown();
			else
				this.straightSniperShot();
		}
		else if (pong.bonusCaught[pong.REVERSE_KEYS_BONUS])
		{
			if (player.pad.keyPressed.W)
				this.sniperShotGoesDown();
			else if (player.pad.keyPressed.S)
				this.sniperShotGoesUp();
			else
				this.straightSniperShot();
		}

	}

	private sniperShot(leftPlayer: Player, rightPlayer: Player, pong: Pong)
	{
		if (this.velocityX < 0)
			this.triggerSniperShot(leftPlayer, pong);
		else if (this.velocityX > 0)
			this.triggerSniperShot(rightPlayer, pong);
		this.toggleColor();
	}

	saveBallState()
	{
		this.saveState.copyVelX = this.velocityX;
		this.saveState.copyVelY = this.velocityY;
		this.saveState.dataSaved = true;
	}

	private wallCollisionTimeLag()
	{
		this.wallCollisionsActivated = false
		setTimeout(() => {
			this.wallCollisionsActivated = true
		}, 400)
	}

	private handleBallCollisions(leftPlayer: Player, rightPlayer: Player, pong: Pong): void
	{
		if ((this.positionY + this.radius) >= HEIGHT || (this.positionY - this.radius) <= 0)
		{
			if (this.wallCollisionsActivated)		
				this.velocityY = -this.velocityY;
			this.wallCollisionTimeLag();
		}
		
		if ((this.positionX + this.radius >= WIDTH - (rightPlayer.pad.width + 10) &&
		(this.positionY >= rightPlayer.pad.positionY && this.positionY <= rightPlayer.pad.positionY + rightPlayer.pad.height)) ||
		(this.positionX - this.radius <= (leftPlayer.pad.width + 10) &&
		(this.positionY >= leftPlayer.pad.positionY && this.positionY <= leftPlayer.pad.positionY + leftPlayer.pad.height)))
		{
			if (this.paddleCollisionsActivated)
			{
				this.hits++;
				if (pong.throwSniperShot && ((this.velocityX > 0 && pong.caughtBy[pong.SNIPER_BONUS] === 'R') || (this.velocityX < 0 && pong.caughtBy[pong.SNIPER_BONUS] === 'L')))
				{
					this.saveBallState();
					this.sniperShot(leftPlayer, rightPlayer, pong);
					pong.throwSniperShot = false;

				}
				else
				{
					if (this.saveState.dataSaved)
						this.resetBallState();
					if (this.velocityX < 0)
						this.makeBallBounce(leftPlayer);
					else if (this.velocityX > 0)
						this.makeBallBounce(rightPlayer);
					this.toggleColor();
				}
			}
			this.paddlesCollisionTimeLag();
			
			// in case the ball touched the top or bottom wall before touching the paddle
			// and is gonna touch the paddle again, wall collsions must be activated
			this.wallCollisionsActivated = true;
		}
		this.increaseBallSpeed();
	}

	public update(leftPlayer: Player, rightPlayer: Player, pong: Pong): void
	{
		this.handleBallCollisions(leftPlayer, rightPlayer, pong);
		this.handleBallInBonusArea(pong);
		this.updateBallPos();
	}

	private generateRandDirectionAndTrajectory()
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
}