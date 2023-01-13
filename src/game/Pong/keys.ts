import { Pong } from './ClassPong';
import { HEIGHT, SLOWER_BONUS, REVERSE_KEYS_BONUS } from './config';
/**
 * Keys
 */

Pong.prototype.standardKeysBehavior = function()
{
	if (this.keyPressed['W'])
	{
		if (this.leftPlayer.positionY > 2 && (this.leftPlayer.positionY - this.leftPlayer.speed) >= 2)
			this.leftPlayer.positionY -= this.leftPlayer.speed;
		else
			this.leftPlayer.positionY = 2;
	}
	if (this.keyPressed['S'])
	{
		if (this.leftPlayer.positionY < HEIGHT - this.leftPlayer.height && (this.leftPlayer.positionY + this.leftPlayer.speed)  <= HEIGHT - this.leftPlayer.height)
			this.leftPlayer.positionY += this.leftPlayer.speed;
		else
		this.leftPlayer.positionY = HEIGHT - this.leftPlayer.height - 2
	}
	if (this.keyPressed['Up'])
	{
		if (this.rightPlayer.positionY > 2 && (this.rightPlayer.positionY - this.rightPlayer.speed) >= 2)
			this.rightPlayer.positionY -= this.rightPlayer.speed;
		else
			this.rightPlayer.positionY = 2;
	}
	if (this.keyPressed['Down'])
	{
		if (this.rightPlayer.positionY < HEIGHT - this.rightPlayer.height && (this.rightPlayer.positionY + this.rightPlayer.speed)  <= HEIGHT - this.rightPlayer.height)
			this.rightPlayer.positionY += this.rightPlayer.speed;
		else
			this.rightPlayer.positionY = HEIGHT - this.rightPlayer.height - 2
	}
}

Pong.prototype.reverseLeftPlayerKeys = function()
{
	if (this.keyPressed['W'])
	{
		if (this.leftPlayer.positionY < HEIGHT - this.leftPlayer.height && (this.leftPlayer.positionY + this.leftPlayer.speed)  <= HEIGHT - this.leftPlayer.height)
			this.leftPlayer.positionY += this.leftPlayer.speed;
		else
		this.leftPlayer.positionY = HEIGHT - this.leftPlayer.height - 2
	}
	if (this.keyPressed['S'])
	{
		if (this.leftPlayer.positionY > 2 && (this.leftPlayer.positionY - this.leftPlayer.speed) >= 2)
			this.leftPlayer.positionY -= this.leftPlayer.speed;
		else
			this.leftPlayer.positionY = 2;
	}
	if (this.keyPressed['Up'])
	{
		if (this.rightPlayer.positionY > 2 && (this.rightPlayer.positionY - this.rightPlayer.speed) >= 2)
			this.rightPlayer.positionY -= this.rightPlayer.speed;
		else
			this.rightPlayer.positionY = 2;
	}
	if (this.keyPressed['Down'])
	{
		if (this.rightPlayer.positionY < HEIGHT - this.rightPlayer.height && (this.rightPlayer.positionY + this.rightPlayer.speed)  <= HEIGHT - this.rightPlayer.height)
			this.rightPlayer.positionY += this.rightPlayer.speed;
		else
			this.rightPlayer.positionY = HEIGHT - this.rightPlayer.height - 2
	}
}

Pong.prototype.reverseRightPlayerKeys = function()
{
	if (this.keyPressed['W'])
	{
		if (this.leftPlayer.positionY > 2 && (this.leftPlayer.positionY - this.leftPlayer.speed) >= 2)
			this.leftPlayer.positionY -= this.leftPlayer.speed;
		else
			this.leftPlayer.positionY = 2;
	}
	if (this.keyPressed['S'])
	{
		if (this.leftPlayer.positionY < HEIGHT - this.leftPlayer.height && (this.leftPlayer.positionY + this.leftPlayer.speed)  <= HEIGHT - this.leftPlayer.height)
			this.leftPlayer.positionY += this.leftPlayer.speed;
		else
		this.leftPlayer.positionY = HEIGHT - this.leftPlayer.height - 2
	}
	if (this.keyPressed['Up'])
	{
		if (this.rightPlayer.positionY < HEIGHT - this.rightPlayer.height && (this.rightPlayer.positionY + this.rightPlayer.speed)  <= HEIGHT - this.rightPlayer.height)
			this.rightPlayer.positionY += this.rightPlayer.speed;
		else
			this.rightPlayer.positionY = HEIGHT - this.rightPlayer.height - 2;

	}
	if (this.keyPressed['Down'])
	{
		if (this.rightPlayer.positionY > 2 && (this.rightPlayer.positionY - this.rightPlayer.speed) >= 2)
			this.rightPlayer.positionY -= this.rightPlayer.speed;
		else
			this.rightPlayer.positionY = 2;
	}
}

Pong.prototype.slowerPlayerSpeed = function()
{
	if (this.caughtBy[SLOWER_BONUS] == 'R')
		this.leftPlayer.speed *= 0.4;
	if (this.caughtBy[SLOWER_BONUS] == 'L')
		this.rightPlayer.speed *= 0.4;
}

Pong.prototype.updateKeyPresses = function()
{
	if (this.bonusCaught[SLOWER_BONUS] && !this.playerSpeedSlowered)
	{
		this.playerSpeedSlowered = true;
		this.slowerPlayerSpeed();
	}
	if (!this.bonusCaught[REVERSE_KEYS_BONUS])
		this.standardKeysBehavior();
	else if (this.caughtBy[REVERSE_KEYS_BONUS] == 'R')
		this.reverseLeftPlayerKeys();
	else if (this.caughtBy[REVERSE_KEYS_BONUS] == 'L')
		this.reverseRightPlayerKeys();
}

Pong.prototype.keyDown = function(key, playerID)
{
	if (playerID == this.leftPlayer.id)
	{
		if (key === 'KeyS')
			this.leftPlayer.keyPressed['S'] = true;
		if (key === 'KeyW')
			this.leftPlayer.keyPressed['W'] = true;
	}
	else if (playerID == this.rightPlayer.id)
	{
		if (key === 'KeyS')
			this.rightPlayer.keyPressed['S'] = true;
		if (key === 'KeyW')
			this.rightPlayer.keyPressed['W'] = true;
	}
	//if (code === 'KeyS')
	//	this.keyPressed['S'] = true;
	//if (code === 'KeyW')
	//	this.keyPressed['W'] = true;
	//if (code === 'ArrowUp')
	//	this.keyPressed['Up'] = true;
	//if (code === 'ArrowDown')
	//	this.keyPressed['Down'] = true;
}

Pong.prototype.keyUp = function(key, playerID)
{
	if (playerID == this.leftPlayer.id)
	{
		if (key === 'KeyS')
			this.leftPlayer.keyPressed['S'] = false;
		if (key === 'KeyW')
			this.leftPlayer.keyPressed['W'] = false;
	}
	else if (playerID == this.rightPlayer.id)
	{
		if (key === 'KeyS')
			this.rightPlayer.keyPressed['S'] = false;
		if (key === 'KeyW')
			this.rightPlayer.keyPressed['W'] = false;
	}
	//if (code === 'KeyS')
	//	this.keyPressed['S'] = false;
	//if (code === 'KeyW')
	//	this.keyPressed['W'] = false;
	//if (code === 'ArrowUp')
	//	this.keyPressed['Up'] = false;
	//if (code === 'ArrowDown')
	//	this.keyPressed['Down'] = false;
}