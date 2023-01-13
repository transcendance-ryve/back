Pong.prototype.collisionTimeLag = function()
{
	this.activated = false
	setTimeout(() => {
		this.activated = true
	}, 800)
}

Pong.prototype.sniperShot = function()
{
	if (!this.bonusCaught[REVERSE_KEYS_BONUS]) // if reverse keys bonus has not been caught 
	{
		if (this.keyPressed.Up || this.keyPressed.W)
		{
			if (this.ball.velocityX > 0)
				this.ball.velocityX = -SNIPER_SPEED_UP_EFFECT_X
			else
				this.ball.velocityX = SNIPER_SPEED_UP_EFFECT_X
			this.ball.velocityY = -SNIPER_SPEED_UP_EFFECT_Y

		}
		else if (this.keyPressed.Down || this.keyPressed.S)
		{
			if (this.ball.velocityX > 0)
				this.ball.velocityX = -SNIPER_SPEED_UP_EFFECT_X
			else
				this.ball.velocityX = SNIPER_SPEED_UP_EFFECT_X
			this.ball.velocityY = SNIPER_SPEED_UP_EFFECT_Y
		}
		else
		{
			if (this.ball.velocityX > 0)
				this.ball.velocityX = -SNIPER_SPEED_UP_EFFECT_X
			else
				this.ball.velocityX = SNIPER_SPEED_UP_EFFECT_X
			this.ball.velocityY = 0
		}
	}
	else // if reverse keys bonus has been caught 
	{
		if (this.keyPressed.Up || this.keyPressed.W)
		{
			if (this.ball.velocityX > 0)
				this.ball.velocityX = -SNIPER_SPEED_UP_EFFECT_X
			else
				this.ball.velocityX = SNIPER_SPEED_UP_EFFECT_X
			this.ball.velocityY = SNIPER_SPEED_UP_EFFECT_Y
		}
		else if (this.keyPressed.Down || this.keyPressed.S)
		{
			if (this.ball.velocityX > 0)
				this.ball.velocityX = -SNIPER_SPEED_UP_EFFECT_X
			else
				this.ball.velocityX = SNIPER_SPEED_UP_EFFECT_X
			this.ball.velocityY = -SNIPER_SPEED_UP_EFFECT_Y
		}
		else
		{
			if (this.ball.velocityX > 0)
				this.ball.velocityX = -SNIPER_SPEED_UP_EFFECT_X
			else
				this.ball.velocityX = SNIPER_SPEED_UP_EFFECT_X
			this.ball.velocityY = 0
		}
	}

	//changes ball color
	if (this.ball.color === this.rightPlayer.color)
		this.ball.color = this.leftPlayer.color
	else if (this.ball.color === this.leftPlayer.color)
		this.ball.color = this.rightPlayer.color		
}

Pong.prototype.makeBallBounce = function()
{
	// gives ball a new direction and effect
	if (this.keyPressed.Up && Math.abs(this.ball.velocityX) * BALL_SPEED_UP_EFFECT <= MAX_BALL_SPEED && this.ball.velocityY < 0)
		this.ball.velocityX = -this.ball.velocityX * BALL_SPEED_UP_EFFECT
	else if (this.keyPressed.Up && Math.abs(this.ball.velocityX) * BALL_SLOW_DOWN_EFFECT >= START_BALL_SPEED && this.ball.velocityY > 0)
		this.ball.velocityX = -this.ball.velocityX * BALL_SLOW_DOWN_EFFECT
	else if (this.keyPressed.Down && Math.abs(this.ball.velocityX) * BALL_SPEED_UP_EFFECT <= MAX_BALL_SPEED && this.ball.velocityY > 0)
		this.ball.velocityX = -this.ball.velocityX * BALL_SPEED_UP_EFFECT
	else if (this.keyPressed.Down && Math.abs(this.ball.velocityX) * BALL_SLOW_DOWN_EFFECT >= START_BALL_SPEED && this.ball.velocityY < 0)
		this.ball.velocityX = -this.ball.velocityX * BALL_SLOW_DOWN_EFFECT
	else if (this.keyPressed.W && Math.abs(this.ball.velocityX) * BALL_SPEED_UP_EFFECT <= MAX_BALL_SPEED && this.ball.velocityY < 0)
		this.ball.velocityX = -this.ball.velocityX * BALL_SPEED_UP_EFFECT
	else if (this.keyPressed.W && Math.abs(this.ball.velocityX) * BALL_SLOW_DOWN_EFFECT >= START_BALL_SPEED && this.ball.velocityY > 0)
		this.ball.velocityX = -this.ball.velocityX * BALL_SLOW_DOWN_EFFECT
	else if (this.keyPressed.S && Math.abs(this.ball.velocityX) * BALL_SPEED_UP_EFFECT <= MAX_BALL_SPEED && this.ball.velocityY > 0)
		this.ball.velocityX = -this.ball.velocityX * BALL_SPEED_UP_EFFECT
	else if (this.keyPressed.S && Math.abs(this.ball.velocityX) * BALL_SLOW_DOWN_EFFECT >= START_BALL_SPEED && this.ball.velocityY < 0)
		this.ball.velocityX = -this.ball.velocityX * BALL_SLOW_DOWN_EFFECT
	else
		this.ball.velocityX = -this.ball.velocityX // no effect

	//changes ball color
	if (this.ball.color === this.rightPlayer.color)
		this.ball.color = this.leftPlayer.color
	else if (this.ball.color === this.leftPlayer.color)
		this.ball.color = this.rightPlayer.color		
}

Pong.prototype.copyBall = function()
{
	this.ballCopy.velocityX = this.ball.velocityX;
	this.ballCopy.velocityY = this.ball.velocityY;
	this.ballCopy.dataCopied = true;
}

Pong.prototype.giveBallPreviousData = function()
{
	this.ball.velocityX = -this.ballCopy.velocityX;

	// makes the ball fall down after sniper shot
	if (this.ballCopy.velocityY > 0)
		this.ball.velocityY = this.ballCopy.velocityY;
	else if (this.ballCopy.velocityY < 0)
		this.ball.velocityY = -this.ballCopy.velocityY;

	this.ballCopy.velocityX = 0;
	this.ballCopy.velocityY = 0;
	this.ballCopy.dataCopied = false;
}



Pong.prototype.handleBallInBonusArea = function()
{
	for (let i = 0; i < NB_BONUS; i++)
	{
		if (this.displayBonus[i] && this.randBonusPosSet[i] && ((this.ball.positionY) >= this.bonus.positionY
			&& (this.ball.positionY) <= (this.bonus.positionY + this.bonus.height))
			&& ((this.ball.positionX) >= this.bonus.positionX
			&& (this.ball.positionX) <= (this.bonus.positionX + this.bonus.width)))
		{
			this.bonusCaught[i] = true;
			if (this.ball.velocityX > 0)
				this.caughtBy[i] = 'L';
			else if (this.ball.velocityX < 0)
				this.caughtBy[i] = 'R';
			if (i == SNIPER_BONUS)
			this.throwSniperShot = true;
		}
	}
	if (this.bonusCaught[SIZE_INCREASE])
		this.increasePlayerSize();
	if (this.bonusCaught[SIZE_DECREASE])
		this.decreasePlayerSize();
}

Pong.prototype.handleBallCollisions = function()
{
	if ((this.ball.positionY + this.ball.radius) >= canvas.height || (this.ball.positionY - this.ball.radius) <= 0)
	this.ball.velocityY = -this.ball.velocityY;

	if ((this.ball.positionX + this.ball.radius >= canvas.width - (this.rightPlayer.width + 10) &&
	(this.ball.positionY >= this.rightPlayer.positionY && this.ball.positionY <= this.rightPlayer.positionY + this.rightPlayer.height)) ||
	(this.ball.positionX - this.ball.radius <= (this.leftPlayer.width + 10) &&
	(this.ball.positionY >= this.leftPlayer.positionY && this.ball.positionY <= this.leftPlayer.positionY + this.leftPlayer.height)))
	{
		if (this.activated)
		{
			this.hits++;
			if (this.throwSniperShot && ((this.ball.velocityX > 0 && this.caughtBy[SNIPER_BONUS] == 'R') || (this.ball.velocityX < 0 && this.caughtBy[SNIPER_BONUS] == 'L')))
			{
				this.copyBall();
				this.sniperShot();
				this.throwSniperShot = false;
			}
			else
			{
				if (this.ballCopy.dataCopied)
					this.giveBallPreviousData();
				this.makeBallBounce();
			}
		}
	this.collisionTimeLag();
	}
}

Pong.prototype.increaseBallSpeed = function()
{
	if (this.hits === this.game.speedIncreaseHit)
	{
		this.hits = 0
		if (Math.abs(this.ball.velocityX) < MAX_BALL_SPEED)
		{
			this.ball.velocityX *= BALL_SPEED_MULTIPLIER
			this.ball.velocityY *= BALL_SPEED_MULTIPLIER
		}
	}
	this.ball.positionX += this.ball.velocityX;
	this.ball.positionY += this.ball.velocityY;
}