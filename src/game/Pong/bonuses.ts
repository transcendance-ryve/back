import { Pong } from "./ClassPong";
import {
	SLOWER_BONUS,
	REVERSE_KEYS_BONUS,
	BONUS_WIDTH,
	BONUS_HEIGHT,
	Y_BONUS_LIMIT,
	X_BONUS_LIMIT,
	HEIGHT,
	WIDTH,
	SIZE_DECREASE,
	SIZE_INCREASE,
	SNIPER_BONUS,
	NB_BONUS,
} from "./config";
/*
** Random bonus position generation
*/

Pong.prototype.randomNb = function(min, max)
{
	let randomNumber = min + Math.random() * (max - min);
	return (randomNumber);
}

Pong.prototype.randomY = function(min, max)
{
	while (1)		// finds randomNumber for Y to not be on the ball's trajectory
	{
		let randomNumber = min + Math.random() * (max - min);
		if (this.ball.velocityX > 0)											// if ball goes right
		{
			if (((this.ball.velocityY > 0)))									// if ball goes down
			{
				if (this.bonus.positionX + BONUS_WIDTH >= this.ball.positionX)				// if BONUS is right to the ball
				{
					if (randomNumber + BONUS_HEIGHT < this.ball.positionY)	// if BONUS is not under the ball
						return (randomNumber);
					else if (BONUS_HEIGHT >= this.ball.positionY - Y_BONUS_LIMIT) // if BONUS cannot be above the ball
						this.bonus.positionX = this.randomNb(X_BONUS_LIMIT, this.ball.positionX - BONUS_WIDTH); // forces BONUS to be left to the ball
				}
				else													// if BONUS is left to the ball
					return (randomNumber);
			}
			else														// if ball goes up
			{
				if (this.bonus.positionX + BONUS_WIDTH >= this.ball.positionX)				// if BONUS is right to the ball
				{
					if (randomNumber > this.ball.positionY)					// if BONUS is not above the ball
						return (randomNumber);
					else if (BONUS_HEIGHT >= HEIGHT - Y_BONUS_LIMIT - this.ball.positionY) // if BONUS cannot be under the ball
						this.bonus.positionX = this.randomNb(X_BONUS_LIMIT, this.ball.positionX - BONUS_WIDTH); // forces BONUS to be left to the ball
				}
				else													// if BONUS is left to the ball
					return (randomNumber);
			}
		}
		else															// if ball goes left
		{
			if (((this.ball.velocityY > 0)))									// if ball goes down
			{
				if (this.bonus.positionX <= this.ball.positionX)							// if BONUS left to the ball
				{
					if (randomNumber + BONUS_HEIGHT < this.ball.positionY)	// if BONUS is not under the ball
						return (randomNumber);
					else if (BONUS_HEIGHT >= this.ball.positionY - Y_BONUS_LIMIT) // if BONUS cannot be above the ball
						this.bonus.positionX = this.randomNb(this.ball.positionX, (WIDTH - BONUS_WIDTH - X_BONUS_LIMIT)); // forces BONUS to be right to the ball
				}
				else													// if BONUS is right to the ball
					return (randomNumber);
			}
			else														// if ball goes up
			{
				if (this.bonus.positionX <= this.ball.positionX)							// if BONUS is left to the ball
				{
					if (randomNumber > this.ball.positionY)					// if BONUS is not above the ball
						return (randomNumber);
					else if (BONUS_HEIGHT >= HEIGHT - Y_BONUS_LIMIT - this.ball.positionY) // if BONUS cannot be under the ball
						this.bonus.positionX = this.randomNb(this.ball.positionX, (WIDTH - BONUS_WIDTH - X_BONUS_LIMIT)); // forces BONUS to be right to the ball
				}
				else													// if BONUS is right to the ball
					return (randomNumber);
			}
		}
	}
}

Pong.prototype.setRandBonusPos = function()
{
	this.bonus.positionX = this.randomNb((X_BONUS_LIMIT), (WIDTH - BONUS_WIDTH - X_BONUS_LIMIT));
	this.bonus.positionY  = this.randomY(Y_BONUS_LIMIT, HEIGHT - BONUS_HEIGHT - Y_BONUS_LIMIT);
}


/*
** Bonuses initialization
*/

Pong.prototype.initImages = function()
{
	this.imController = new Image();
	this.imController.src = "../bonuses_images/game-controller.svg";
	
	this.imFriends = new Image();
	this.imFriends.src = "../bonuses_images/friends.svg";
	
	this.imBell = new Image();
	this.imBell.src = "../bonuses_images/bell.svg";
	
	this.imPlay = new Image();
	this.imPlay.src = "../bonuses_images/Play.svg";
	
	this.imEye = new Image();
	this.imEye.src = "../bonuses_images/Eye.svg";
}

Pong.prototype.initMapBonusImages = function()
{
	this.bonus.mapBonusImages = new Map();
	this.bonus.mapBonusImages.set(SIZE_DECREASE, this.imController);
	this.bonus.mapBonusImages.set(SIZE_INCREASE, this.imFriends);
	this.bonus.mapBonusImages.set(REVERSE_KEYS_BONUS, this.imBell);
	this.bonus.mapBonusImages.set(SLOWER_BONUS, this.imPlay);
	this.bonus.mapBonusImages.set(SNIPER_BONUS, this.imEye);
}

Pong.prototype.genSingleRandNumber = function(tab)
{
	let nb = Math.floor(Math.random() * NB_BONUS); // generate random number from 0 to 4
	while (tab.includes(nb)) // while nb is in tab
		nb = Math.floor(Math.random() * NB_BONUS); // generate new number
	return (nb);
}
	
/*Pong.prototype.setRandBonusesOrder = function()
{
	let tab = [];
	
	SIZE_DECREASE = this.genSingleRandNumber(tab);
	tab.push(SIZE_DECREASE);
	
	SIZE_INCREASE = this.genSingleRandNumber(tab);
	tab.push(SIZE_INCREASE);
	
	REVERSE_KEYS_BONUS = this.genSingleRandNumber(tab);
	tab.push(REVERSE_KEYS_BONUS);
	
	SLOWER_BONUS = this.genSingleRandNumber(tab);
	tab.push(SLOWER_BONUS);
	
	SNIPER_BONUS = this.genSingleRandNumber(tab);
	tab.push(SNIPER_BONUS);
}*/

Pong.prototype.initBonusesVars = function()
{
	this.setRandBonusesOrder();
	this.initImages();
	this.initMapBonusImages();
	for (let i = 0; i < NB_BONUS * 2; i++)
	{
		this.timeOutIDs[i] = 0;
		this.timeOver[i] = false;
		this.caughtBy[i] = "no one";
		this.bonusCaught[i] = false;
		this.randBonusPosSet[i] = false;
		this.bonusCountDownLaunched[i] = false;
		if (i === 0)
			this.displayBonus[i] = true;
		else
			this.displayBonus[i] = false;
	}
}
