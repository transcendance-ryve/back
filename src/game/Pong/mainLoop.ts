import { Pong } from './ClassPong';
import { TICK_INTERVAL } from './config';

interface Paddles {
	left: {
		x: number,
		y: number,
		width: number,
		height: number,
		color: string,
	},
	right: {
		x: number,
		y: number,
		width: number,
		height: number,
		color: string,
	},
}

interface Ball {
	x: number,
	y: number,
	radius: number,
	color: string,
}

Pong.prototype.updateStates = function ()
{
	this.handleBallCollisions();
	this.handleBallInBonusArea();
	this.setScore();
	this.gameOver();
	this.resetPlayersHeight();
	this.increaseBallSpeed();
}

/**
 * game loop
 */

Pong.prototype.getDrawingData = function () 
{
	let leftPlayerDrawingData = {
		x: this.leftPlayer.positionX,
		y: this.leftPlayer.positionY,
		width: this.leftPlayer.width,
		height: this.leftPlayer.height,
		color: this.leftPlayer.color
	};

	let rightPlayerDrawingData = {
		x: this.rightPlayer.positionX,
		y: this.rightPlayer.positionY,
		width: this.rightPlayer.width,
		height: this.rightPlayer.height,
		color: this.rightPlayer.color
	};


	let ballDrawingData = {
		x: this.ball.positionX,
		y: this.ball.positionY,
		radius: this.ball.radius,
		color: this.ball.color
	};

	const paddles: Paddles = {
		left: leftPlayerDrawingData,
		right: rightPlayerDrawingData,
	};
	const ball: Ball = ballDrawingData;
	const game = { paddles, ball};
	return (game);
}
