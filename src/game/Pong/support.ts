import { Pong } from '../entities/Pong.entities';
import {
	HEIGHT,
	WIDTH,
	PLAYERS_WIDTH,
	PLAYERS_HEIGHT,
	SIZE_INCREASE,
	SIZE_DECREASE,
	PLAYER_SHRINK_MULTIPLIER,
	PLAYERS_SHRINK_POSITION_FIX,
	PLAYER_INCREASE_MULTIPLIER,
	PLAYERS_GROWTH_POSITION_FIX,
	START_BALL_RADIUS,
	START_BALL_SPEED,
	REVERSE_KEYS_BONUS,
	SLOWER_BONUS,
	SNIPER_BONUS,
	PLAYERS_SPEED,
	NB_BONUS,
} from './config';

/**
 * Support
 */

Pong.prototype.giveBallRandDirection = function () {
	if (this.randomNb(0, 1) > 0.5)
		this.ball.velocityX = -this.ball.velocityX;
	if (this.randomNb(0, 1) > 0.5)
		this.ball.velocityY = -this.ball.velocityY;
	if (this.ball.velocityX < 0)
		this.ball.color = this.rightPlayer.color;
}

Pong.prototype.updateObjectsPos = function () {
	// WIDTH = canvasWrapper.offsetWidth;
	// HEIGHT = canvasWrapper.offsetHeight;

	this.ball.positionX = WIDTH / 2 - this.start_BALL_RADIUS / 2
	this.ball.positionY = HEIGHT / 2 - this.start_BALL_RADIUS / 2

	this.rightPlayer.positionX = WIDTH - (PLAYERS_WIDTH + 10)

	if (this.game.leftScore === 0 && this.game.rightScore === 0) {
		this.leftPlayer.positionY = HEIGHT / 2 - PLAYERS_HEIGHT / 2
		this.rightPlayer.positionY = HEIGHT / 2 - PLAYERS_HEIGHT / 2
	}
}

Pong.prototype.setScore = function () {
	if (this.ball.positionX > WIDTH - (this.rightPlayer.width)) {
		this.game.leftScore++;
		this.ball.color = this.rightPlayer.color;
		this.resetBall();
		if (this.bonusCaught[SIZE_INCREASE])
			this.playerIncreased = true;
		if (this.bonusCaught[SIZE_DECREASE])
			this.playerDecreased = true;
		this.resetBonuses()
	}
	else if (this.ball.positionX < this.rightPlayer.width) {
		this.game.rightScore++;
		this.ball.color = this.leftPlayer.color;
		this.resetBall();
		if (this.bonusCaught[SIZE_INCREASE])
			this.playerIncreased = true;
		if (this.bonusCaught[SIZE_DECREASE])
			this.playerDecreased = true;
		this.resetBonuses()
	}
	document.getElementsByClassName('left')[0].textContent = this.game.leftScore
	document.getElementsByClassName('right')[0].textContent = this.game.rightScore
}

Pong.prototype.gameOver = function () {
	if (this.game.leftScore === this.game.topScore) {
		console.log('Left Wins');
		// sessionStorage.setItem("winner", "Left");
		window.location.href = "winner.html";
		this.resetgame();
	}
	else if (this.game.rightScore === this.game.topScore) {
		console.log('Right Wins');
		// sessionStorage.setItem("winner", "Right");
		window.location.href = "winner.html";
		this.resetgame();
	}
}

Pong.prototype.resetgame = function () {
	this.game.leftScore = 0
	this.game.rightScore = 0
	this.ball.positionX = 0
	this.ball.positionY = 0
	this.leftPlayer.positionY = HEIGHT / 2 - this.leftPlayer.height / 2
	this.rightPlayer.positionY = HEIGHT / 2 - PLAYERS_HEIGHT / 2
	this.updateObjectsPos()
}

Pong.prototype.resetPlayersHeight = function () {
	// decreases players heights if they have been increased
	if (this.playerIncreased) {
		if (this.rightPlayer.height > PLAYERS_HEIGHT) {
			this.rightPlayer.height *= PLAYER_SHRINK_MULTIPLIER;
			this.rightPlayer.positionY += PLAYERS_SHRINK_POSITION_FIX;

			// gives PLAYER_HEIGHT to the player when its height is close enough to stop modifying it
			if ((this.rightPlayer.height > PLAYERS_HEIGHT - 2) && (this.rightPlayer.height < PLAYERS_HEIGHT + 2))
				this.rightPlayer.height = PLAYERS_HEIGHT;
		}
		if (this.leftPlayer.height > PLAYERS_HEIGHT) {
			this.leftPlayer.height *= PLAYER_SHRINK_MULTIPLIER;
			this.leftPlayer.positionY += PLAYERS_SHRINK_POSITION_FIX;

			// gives PLAYER_HEIGHT to the player when its height is close enough to stop modifying it
			if ((this.leftPlayer.height > PLAYERS_HEIGHT - 2) && (this.leftPlayer.height < PLAYERS_HEIGHT + 2))
				this.leftPlayer.height = PLAYERS_HEIGHT;
		}
	}

	// increases players heights if they have been decreased
	if (this.playerDecreased) {
		if (this.rightPlayer.height < PLAYERS_HEIGHT) {
			this.rightPlayer.height *= PLAYER_INCREASE_MULTIPLIER;
			this.rightPlayer.positionY -= PLAYERS_GROWTH_POSITION_FIX;

			// gives PLAYER_HEIGHT to the player when its height is close enough to stop modifying it
			if ((this.rightPlayer.height > PLAYERS_HEIGHT - 2) && (this.rightPlayer.height < PLAYERS_HEIGHT + 2))
				this.rightPlayer.height = PLAYERS_HEIGHT;
		}
		if (this.leftPlayer.height < PLAYERS_HEIGHT) {
			this.leftPlayer.height *= PLAYER_INCREASE_MULTIPLIER;
			this.leftPlayer.positionY -= PLAYERS_GROWTH_POSITION_FIX;

			// gives PLAYER_HEIGHT to the player when its height is close enough to stop modifying it
			if ((this.leftPlayer.height > PLAYERS_HEIGHT - 2) && (this.leftPlayer.height < PLAYERS_HEIGHT + 2))
				this.leftPlayer.height = PLAYERS_HEIGHT;
		}
	}
}

Pong.prototype.resetBall = function () {
	// centers the ball
	this.ball.positionX = WIDTH / 2 - START_BALL_RADIUS / 2
	this.ball.positionY = HEIGHT / 2 - START_BALL_RADIUS / 2

	// saves the ball direction
	let velocityX = this.ball.velocityX

	// makes the ball freeze
	this.ball.velocityX = 0
	this.ball.velocityY = 0

	this.ballFreezed = true; // prevent bonuses from being displayed while the ball is reset

	this.ball.radius = START_BALL_RADIUS;
	setTimeout(() => {
		if (velocityX < 0) {
			this.ball.velocityX = START_BALL_SPEED
			this.ball.velocityY = START_BALL_SPEED
		}
		else {
			this.ball.velocityX = -START_BALL_SPEED
			this.ball.velocityY = -START_BALL_SPEED
		}
		if (this.ballFreezed)
			this.start = Date.now();
		this.ballFreezed = false;
		this.playerIncreased = false;
		this.playerDecreased = false;
	}, 1000)
}

Pong.prototype.resetBonuses = function () {
	this.caughtBy[SIZE_DECREASE] = "no one";
	this.caughtBy[SIZE_INCREASE] = "no one";
	this.caughtBy[REVERSE_KEYS_BONUS] = "no one";
	this.caughtBy[SLOWER_BONUS] = "no one";
	this.caughtBy[SNIPER_BONUS] = "no one";

	this.bonusCaught[SIZE_DECREASE] = false;
	this.bonusCaught[SIZE_INCREASE] = false;
	this.bonusCaught[REVERSE_KEYS_BONUS] = false;
	this.bonusCaught[SLOWER_BONUS] = false;
	this.bonusCaught[SNIPER_BONUS] = false;

	this.displayBonus[0] = true;
	this.displayBonus[1] = false;
	this.displayBonus[2] = false;
	this.displayBonus[3] = false;
	this.displayBonus[4] = false;

	this.bonusCountDownLaunched[SIZE_DECREASE] = false;
	this.bonusCountDownLaunched[SIZE_INCREASE] = false;
	this.bonusCountDownLaunched[REVERSE_KEYS_BONUS] = false;
	this.bonusCountDownLaunched[SLOWER_BONUS] = false;
	this.bonusCountDownLaunched[SNIPER_BONUS] = false;

	this.randBonusPosSet[SIZE_DECREASE] = false;
	this.randBonusPosSet[SIZE_INCREASE] = false;
	this.randBonusPosSet[REVERSE_KEYS_BONUS] = false;
	this.randBonusPosSet[SLOWER_BONUS] = false;
	this.randBonusPosSet[SNIPER_BONUS] = false;

	this.timeOver[SIZE_DECREASE] = false;
	this.timeOver[SIZE_INCREASE] = false;
	this.timeOver[REVERSE_KEYS_BONUS] = false;
	this.timeOver[SLOWER_BONUS] = false;
	this.timeOver[SNIPER_BONUS] = false;

	if (this.playerSpeedSlowered) {
		this.playerSpeedSlowered = false;
		this.leftPlayer.speed = PLAYERS_SPEED;
		this.rightPlayer.speed = PLAYERS_SPEED;
	}
	for (let i = 0; i < NB_BONUS * 2; i++)
		clearTimeout(this.timeOutIDs[i]);
	this.initBonusesVars();
	this.leftPlayer.increased = false;
	this.leftPlayer.decreased = false;
	this.leftPlayer.counterIncreaseEffect = false;
	this.leftPlayer.counterDecreaseEffect = false;
	this.rightPlayer.increased = false;
	this.rightPlayer.decreased = false;
	this.rightPlayer.counterIncreaseEffect = false;
	this.rightPlayer.counterDecreaseEffect = false;

	// if previous shot has been scored with a sniper shot, this var can be set on false now
	this.ballCopy.dataCopied = false;
}