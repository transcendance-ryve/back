import { Server } from "socket.io";
import {
	HEIGHT,
	WIDTH,
	PLAYERS_HEIGHT,
	PLAYERS_WIDTH,
	PLAYERS_SPEED,
	START_BALL_SPEED,
	BONUS_HEIGHT,
	BONUS_WIDTH,
	BONUS_LIFETIME_0,
	BONUS_LIFETIME_1,
	BONUS_LIFETIME_2,
	BONUS_LIFETIME_3,
	BONUS_LIFETIME_4,
	START_BALL_RADIUS,
	} from "./config";

export class Pong
{
	constructor(PlayerOne, PlayerTwo, _server: Server){
		this.leftPlayer.id = PlayerOne;
		this.rightPlayer.id = PlayerTwo;
		this.gameId = PlayerOne + PlayerTwo;
	}

	standardKeysBehavior;
	reverseLeftPlayerKeys;
	reverseRightPlayerKeys;
	slowerPlayerSpeed;
	updateKeyPresses;
	keyDown;
	keyUp;
	giveBallRandDirection;
	updateObjectsPos;
	setScore;
	gameOver;
	resetgame;
	resetPlayersHeight;
	resetBall;
	resetBonuses;
	randomNb;
	randomY;
	setRandBonusPos;
	initImages;
	initMapBonusImages;
	genSingleRandNumber;
	setRandBonusesOrder;
	initBonusesVars;
	updateStates;
	gameLoop;
	getDrawingData;
	/*
	** Game variables
	*/

	gameId: string = null;
	activated = true;
	hits = 0;
	ballFreezed = false;
	nextTickTime = 0;

	game = {
		leftScore: 0,
		rightScore: 0,	
		topScore: 5,
		speedIncreaseHit: 1,
	}

	/*
	** Constant objects
	*/

	leftPlayer = {
		height: PLAYERS_HEIGHT,
		width: PLAYERS_WIDTH,
		positionX: 10,
		positionY: HEIGHT / 2 - PLAYERS_HEIGHT / 2,
		color: "#1c5be6",
		// player: 'left',
		speed: PLAYERS_SPEED,
		increased: false,
		decreased: false,
		counterIncreaseEffect: false,
		counterDecreaseEffect: false,
		keyPressed: {
			W: false,
			S: false,
		},
		id: null,
	}
	
	rightPlayer = {
		height: PLAYERS_HEIGHT,
		width: PLAYERS_WIDTH,
		positionX: WIDTH - (10 + PLAYERS_WIDTH),
		positionY: HEIGHT / 2 - PLAYERS_HEIGHT / 2,
		color: '#FF4646',
		// player: 'right',
		speed: PLAYERS_SPEED,
		increased: false,
		decreased: false,
		counterIncreaseEffect: false,
		counterDecreaseEffect: false,
		keyPressed: {
			W: false,
			S: false,
		},
		id: null,

	}
	
	ball = {
		radius: START_BALL_RADIUS,
		positionX: WIDTH / 2 - START_BALL_RADIUS / 2,
		positionY: HEIGHT / 2 - START_BALL_RADIUS / 2,
		velocityX: START_BALL_SPEED,
		velocityY: START_BALL_SPEED,
		color: this.leftPlayer.color
	}

	/*
	** Bonuses images
	*/
	
	imController;
	imFriends;
	imBell;
	imPlay;
	imEye;
	//mapBonusImages;

	/*
	** Bonuses variables
	*/

	playerIncreased = false;
	playerDecreased = false;
	throwSniperShot = false;

	displayBonus = {};
	bonusCountDownLaunched = {};
	randBonusPosSet = {};
	bonusCaught = {};
	caughtBy = {};
	timeOver = {};
	start = Date.now();
	timeOutIDs = {};

	bonusLifetimes = [
		BONUS_LIFETIME_0 * 1000,
		BONUS_LIFETIME_1 * 1000,
		BONUS_LIFETIME_2 * 1000,
		BONUS_LIFETIME_3 * 1000,
		BONUS_LIFETIME_4 * 1000
	]

	ballCopy = {
		velocityX: 0,
		velocityY: 0,
		dataCopied: false
	}

	bonus = {
		height: BONUS_HEIGHT,
		width: BONUS_WIDTH,
		positionX: 0,
		positionY: 0,
		//mapBonusImages: this.mapBonusImages
	}
	
	/*
	** Keys related variables
	*/

	playerSpeedSlowered = false;
	keyPressed = {
		W: false,
		S: false,
		Up: false,
		Down: false,
	}

	/*
	** Launching game function
	*/

	i = 0;

	getCanvasDimensions = function () {
		const canvasDimensions = {
			height: 390,
			width: 790
		}
		return (canvasDimensions);
	}

	launchGame()
	{
		document.addEventListener('keydown', this.keyDown.bind(this), false);
		document.addEventListener('keyup', this.keyUp.bind(this), false);
		this.giveBallRandDirection();
		this.initBonusesVars();

		console.log(this.getCanvasDimensions());
		
		requestAnimationFrame(this.gameLoop);
	}

	// Enables gameLoop function to be called inside its own scope using `this`
	//this.gameLoop.bind(this);
}