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
	NB_BONUS,
	TICK_INTERVAL,
	SLOWER_BONUS,
	REVERSE_KEYS_BONUS,
	Y_BONUS_LIMIT,
	X_BONUS_LIMIT,
	SIZE_DECREASE,
	SIZE_INCREASE,
	SNIPER_BONUS,
	PLAYER_SHRINK_MULTIPLIER,
	PLAYERS_SHRINK_POSITION_FIX,
	PLAYER_INCREASE_MULTIPLIER,
	PLAYERS_GROWTH_POSITION_FIX,
	BALL_SPEED_UP_EFFECT,
	SNIPER_SPEED_UP_EFFECT_X,
	SNIPER_SPEED_UP_EFFECT_Y,
	BALL_SLOW_DOWN_EFFECT,
	MAX_BALL_SPEED,
	BALL_SPEED_MULTIPLIER,
	} from "../Pong/config";
import { GameService } from "../game.service";

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

interface endGamePlayer {
	id: string,
	score: number,
	win: boolean,
	loose: boolean,
}

export class Pong
{
	constructor(gameId, PlayerOne, PlayerTwo, _server: Server, _gameService: GameService){
		this.leftPlayer.id = PlayerOne;
		this.rightPlayer.id = PlayerTwo;
		this.game.gameId = gameId;
		this._server = _server;
		this._gameService = _gameService;
	}

	_gameService: GameService;
	/*
	** Game variables
	*/

	_server: Server;
	activated = true;
	hits = 0;
	ballFreezed = false;
	nextTickTime = 0;
	
	game = {
		gameId: null,
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
		this.giveBallRandDirection();
		this.initBonusesVars();
		this.gameLoop();
		return this.game;
	}
	
	async gameLoop()
	{
		this.updateKeyPresses();
		this._server.to(this.game.gameId).emit("update", this.getDrawingData());
		this.updateStates();
		await setTimeout(async () => {this.gameLoop();}, 16);
	}


	giveBallRandDirection = function () {
		if (this.randomNb(0, 1) > 0.5)
			this.ball.velocityX = -this.ball.velocityX;
		if (this.randomNb(0, 1) > 0.5)
			this.ball.velocityY = -this.ball.velocityY;
		if (this.ball.velocityX < 0)
			this.ball.color = this.rightPlayer.color;
	}

	initBonusesVars = function()
	{
		//this.setRandBonusesOrder();
		//this.initImages();
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

	randomNb = function(min, max)
	{
		let randomNumber = min + Math.random() * (max - min);
		return (randomNumber);
	}

	/*initImages = function()
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
	}*/

	standardKeysBehavior = function()
	{
		//console.log("MES GRAND MORTS");
		if (this.leftPlayer.keyPressed['W'])
		{
			if (this.leftPlayer.positionY > 2 && (this.leftPlayer.positionY - this.leftPlayer.speed) >= 2)
				this.leftPlayer.positionY -= this.leftPlayer.speed;
			else
				this.leftPlayer.positionY = 2;
		}
		if (this.leftPlayer.keyPressed['S'])
		{
			if (this.leftPlayer.positionY < HEIGHT - this.leftPlayer.height && (this.leftPlayer.positionY + this.leftPlayer.speed)  <= HEIGHT - this.leftPlayer.height)
				this.leftPlayer.positionY += this.leftPlayer.speed;
			else
			this.leftPlayer.positionY = HEIGHT - this.leftPlayer.height - 2
		}
		if (this.rightPlayer.keyPressed['W'])
		{
			if (this.rightPlayer.positionY > 2 && (this.rightPlayer.positionY - this.rightPlayer.speed) >= 2)
				this.rightPlayer.positionY -= this.rightPlayer.speed;
			else
				this.rightPlayer.positionY = 2;
		}
		if (this.rightPlayer.keyPressed['S'])
		{
			if (this.rightPlayer.positionY < HEIGHT - this.rightPlayer.height && (this.rightPlayer.positionY + this.rightPlayer.speed)  <= HEIGHT - this.rightPlayer.height)
				this.rightPlayer.positionY += this.rightPlayer.speed;
			else
				this.rightPlayer.positionY = HEIGHT - this.rightPlayer.height - 2
		}
	}

	reverseLeftPlayerKeys = function()
	{
		if (this.leftPlayer.keyPressed['W'])
		{
			if (this.leftPlayer.positionY < HEIGHT - this.leftPlayer.height && (this.leftPlayer.positionY + this.leftPlayer.speed)  <= HEIGHT - this.leftPlayer.height)
				this.leftPlayer.positionY += this.leftPlayer.speed;
			else
			this.leftPlayer.positionY = HEIGHT - this.leftPlayer.height - 2
		}
		if (this.leftPlayer.keyPressed['S'])
		{
			if (this.leftPlayer.positionY > 2 && (this.leftPlayer.positionY - this.leftPlayer.speed) >= 2)
				this.leftPlayer.positionY -= this.leftPlayer.speed;
			else
				this.leftPlayer.positionY = 2;
		}
		if (this.rightPlayer.keyPressed['Up'])
		{
			if (this.rightPlayer.positionY > 2 && (this.rightPlayer.positionY - this.rightPlayer.speed) >= 2)
				this.rightPlayer.positionY -= this.rightPlayer.speed;
			else
				this.rightPlayer.positionY = 2;
		}
		if (this.rightPlayer.keyPressed['Down'])
		{
			if (this.rightPlayer.positionY < HEIGHT - this.rightPlayer.height && (this.rightPlayer.positionY + this.rightPlayer.speed)  <= HEIGHT - this.rightPlayer.height)
				this.rightPlayer.positionY += this.rightPlayer.speed;
			else
				this.rightPlayer.positionY = HEIGHT - this.rightPlayer.height - 2
		}
	}

	reverseRightPlayerKeys = function()
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

	slowerPlayerSpeed = function()
	{
		if (this.caughtBy[SLOWER_BONUS] == 'R')
			this.leftPlayer.speed *= 0.4;
		if (this.caughtBy[SLOWER_BONUS] == 'L')
			this.rightPlayer.speed *= 0.4;
	}

	updateKeyPresses = function()
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

	keyDown = function(key, playerID)
	{
		if (playerID == this.leftPlayer.id)
		{
			if (key === 'S')
				this.leftPlayer.keyPressed['S'] = true;
			if (key === 'W')
				this.leftPlayer.keyPressed['W'] = true;
		}
		else if (playerID == this.rightPlayer.id)
		{
			if (key === 'S')
				this.rightPlayer.keyPressed['S'] = true;
			if (key === 'W')
				this.rightPlayer.keyPressed['W'] = true;
		}

	}

	keyUp = function(key, playerID)
	{
		if (playerID == this.leftPlayer.id)
		{
			if (key === 'S')
				this.leftPlayer.keyPressed['S'] = false;
			if (key === 'W')
				this.leftPlayer.keyPressed['W'] = false;
		}
		else if (playerID == this.rightPlayer.id)
		{
			if (key === 'S')
				this.rightPlayer.keyPressed['S'] = false;
			if (key === 'W')
				this.rightPlayer.keyPressed['W'] = false;
		}
	}

	randomY = function(min, max)
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

	setRandBonusPos = function()
	{
		this.bonus.positionX = this.randomNb((X_BONUS_LIMIT), (WIDTH - BONUS_WIDTH - X_BONUS_LIMIT));
		this.bonus.positionY  = this.randomY(Y_BONUS_LIMIT, HEIGHT - BONUS_HEIGHT - Y_BONUS_LIMIT);
	}

	initMapBonusImages = function()
	{
		this.bonus.mapBonusImages = new Map();
		this.bonus.mapBonusImages.set(SIZE_DECREASE, this.imController);
		this.bonus.mapBonusImages.set(SIZE_INCREASE, this.imFriends);
		this.bonus.mapBonusImages.set(REVERSE_KEYS_BONUS, this.imBell);
		this.bonus.mapBonusImages.set(SLOWER_BONUS, this.imPlay);
		this.bonus.mapBonusImages.set(SNIPER_BONUS, this.imEye);
	}

	genSingleRandNumber = function(tab)
	{
		let nb = Math.floor(Math.random() * NB_BONUS); // generate random number from 0 to 4
		while (tab.includes(nb)) // while nb is in tab
			nb = Math.floor(Math.random() * NB_BONUS); // generate new number
		return (nb);
	}
	
	updateStates = function ()
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
	
	getDrawingData = function () 
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

	updateObjectsPos = function () {
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
	
	setScore = function () {
		if (this.ball.positionX > WIDTH - (this.rightPlayer.width)) {
			this.game.leftScore++;
			this.ball.color = this.rightPlayer.color;
			this.resetBall();
			if (this.bonusCaught[SIZE_INCREASE])
				this.playerIncreased = true;
			if (this.bonusCaught[SIZE_DECREASE])
				this.playerDecreased = true;
			this.resetBonuses();
			const data = {
				id: this.leftPlayer.id,
				score: this.game.leftScore
			}
			this._server.to(this.game.gameId).emit('score', data);
		}
		else if (this.ball.positionX < this.rightPlayer.width) {
			this.game.rightScore++;
			this.ball.color = this.leftPlayer.color;
			this.resetBall();
			if (this.bonusCaught[SIZE_INCREASE])
				this.playerIncreased = true;
			if (this.bonusCaught[SIZE_DECREASE])
				this.playerDecreased = true;
			this.resetBonuses();
			const data = {
				id: this.rightPlayer.id,
				score: this.game.rightScore
			}
			this._server.to(this.game.gameId).emit('score', data);
		}
	}
	
	gameOver = function () {
		if (this.game.leftScore === this.game.topScore) {
			console.log('Left Wins');
			const playerOne: endGamePlayer = {
				id: this.leftPlayer.id,
				score: this.game.leftScore,
				win: true,
				loose: false,
			}
			const playerTwo: endGamePlayer = {
				id: this.rightPlayer.id,
				score: this.game.rightScore,
				win: false,
				loose: true,
			}
			this._server.to(this.game.gameId).emit('gameWin', this.leftPlayer.id);
			this._server.to(this.game.gameId).emit('gameLoose', this.rightPlayer.id);
			this._gameService.endGame(playerOne, playerTwo);
			this.resetgame();
		}
		else if (this.game.rightScore === this.game.topScore) {
			const playerOne: endGamePlayer = {
				id: this.leftPlayer.id,
				score: this.game.leftScore,
				win: false,
				loose: true,
			}
			const playerTwo: endGamePlayer = {
				id: this.rightPlayer.id,
				score: this.game.rightScore,
				win: true,
				loose: false,
			}
			console.log('Right Wins');
			this._server.to(this.game.gameId).emit('gameWin', this.rightPlayer.id);
			this._server.to(this.game.gameId).emit('gameLoose', this.leftPlayer.id);
			this._gameService.endGame(playerOne, playerTwo);
			this.resetgame();
		}
	}
	
	resetgame = function () {
		this.game.leftScore = 0
		this.game.rightScore = 0
		this.ball.positionX = 0
		this.ball.positionY = 0
		this.leftPlayer.positionY = HEIGHT / 2 - this.leftPlayer.height / 2
		this.rightPlayer.positionY = HEIGHT / 2 - PLAYERS_HEIGHT / 2
		this.updateObjectsPos()
	}
	
	resetPlayersHeight = function () {
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
	
	resetBall = function () {
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
	
	resetBonuses = function () {
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

	collisionTimeLag = function()
	{
		this.activated = false
		setTimeout(() => {
			this.activated = true
		}, 800)
	}

	sniperShot = function()
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

	makeBallBounce = function()
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

	copyBall = function()
	{
		this.ballCopy.velocityX = this.ball.velocityX;
		this.ballCopy.velocityY = this.ball.velocityY;
		this.ballCopy.dataCopied = true;
	}

	giveBallPreviousData = function()
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

	handleBallInBonusArea = function()
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

	handleBallCollisions = function()
	{
		if ((this.ball.positionY + this.ball.radius) >= HEIGHT || (this.ball.positionY - this.ball.radius) <= 0)
		this.ball.velocityY = -this.ball.velocityY;

		if ((this.ball.positionX + this.ball.radius >= WIDTH - (this.rightPlayer.width + 10) &&
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

	increaseBallSpeed = function()
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

}