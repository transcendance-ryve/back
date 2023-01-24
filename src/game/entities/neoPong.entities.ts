import { Server } from "socket.io";
import GameService from "../game.service";
import { Paddles, EndGamePlayer } from "../interfaces/game.interface";
import { Player } from "./Player.entities";
import { color,
	WIDTH,
	HEIGHT,
	PLAYERS_HEIGHT,
	PLAYERS_WIDTH,
	START_BALL_RADIUS,
	TICK_INTERVAL,
	NB_BONUS,
	BONUSES_START,
	RAND_GEN_AREA_X,
	BONUS_LIFETIME,
	BONUSES_INTERVAL,
	PLAYERS_SPEED,
	PLAYER_SHRINK_MULTIPLIER,
	PLAYERS_SHRINK_POSITION_FIX,
	PLAYERS_SHRINK_POSITION_FIX2,
	PLAYERS_MIN_HEIGHT,
	PLAYER_INCREASE_MULTIPLIER,
	PLAYERS_GROWTH_POSITION_FIX,
	PLAYERS_MAX_HEIGHT,
	PLAYER_TO_BORDER_GAP,
	PLAYER_TO_BOTTOM_BORDER_GAP_FIX,
} from "./utils.entities";
import { Ball } from "./Ball.entities";
import { Bonus } from "./Bonus.entities"
import { emit } from "process";

export class Pong
{
	constructor(gameId:string, leftPlayerID: string,
		rightPlayerID: string, _server: Server, _gameService: GameService, bonusesActivated: boolean)
	{
		this.leftPlayer = new Player(leftPlayerID, color.blue);
		this.rightPlayer = new Player(rightPlayerID, color.red);
		this._gameService = _gameService;
		this._server = _server;
		this.gameId = gameId;
		this.start = true;
		this.bonusesActivated = bonusesActivated;
	}

	destructor(){
		delete(this.ball);
		delete(this.leftPlayer);
		delete(this.rightPlayer);
	}
	_gameService: GameService;
	_server: Server;
	gameId: string;
	topScore: number = 5;
	start: boolean = false;
	timeout: NodeJS.Timeout;
	startTime: number;

	ball = new Ball();
	leftPlayer: Player;
	rightPlayer: Player;
	bonusesActivated: boolean;

	// generateBonusSurMap();
	// removeBonusSurMap();

//-------------BONUS VARIABLES---------------//
	mapBonus = new Map();

	SIZE_DECREASE: number;
	SIZE_INCREASE: number;
	REVERSE_KEYS_BONUS: number;
	SLOWER_BONUS: number;
	SNIPER_BONUS: number;


	playerIncreased = false;
	playerDecreased = false;
	throwSniperShot = false;

	displayBonus: boolean[] = [];
	bonusCountDownLaunched: boolean[] = [];
	randBonusPosSet: boolean[] = [];
	bonusCaught: boolean[] = [];
	caughtBy: string[] = [];
	timeOver: boolean[] = [];
	gameStartTimer: number;
	timeOutIDs: NodeJS.Timeout[] = [];

//-------------BONUS VARIABLES---------------//

	resetPlayersHeight()
	{
		// decreases players heights if they have been increased
		if (this.playerIncreased) {
			if (this.rightPlayer.pad.height > PLAYERS_HEIGHT)
			{
				this.rightPlayer.pad.height *= PLAYER_SHRINK_MULTIPLIER;
				this.rightPlayer.pad.positionY += PLAYERS_SHRINK_POSITION_FIX;

				// gives PLAYER_HEIGHT to the player when its height is close enough to stop modifying it
				if ((this.rightPlayer.pad.height > PLAYERS_HEIGHT - 2) && (this.rightPlayer.pad.height < PLAYERS_HEIGHT + 2))
					this.rightPlayer.pad.height = PLAYERS_HEIGHT;
			}
			if (this.leftPlayer.pad.height > PLAYERS_HEIGHT)
			{
				this.leftPlayer.pad.height *= PLAYER_SHRINK_MULTIPLIER;
				this.leftPlayer.pad.positionY += PLAYERS_SHRINK_POSITION_FIX;

				// gives PLAYER_HEIGHT to the player when its height is close enough to stop modifying it
				if ((this.leftPlayer.pad.height > PLAYERS_HEIGHT - 2) && (this.leftPlayer.pad.height < PLAYERS_HEIGHT + 2))
					this.leftPlayer.pad.height = PLAYERS_HEIGHT;
			}
		}

		// increases players heights if they have been decreased
		if (this.playerDecreased) {
			if (this.rightPlayer.pad.height < PLAYERS_HEIGHT)
			{
				this.rightPlayer.pad.height *= PLAYER_INCREASE_MULTIPLIER;
				this.rightPlayer.pad.positionY -= PLAYERS_GROWTH_POSITION_FIX;

				// gives PLAYER_HEIGHT to the player when its height is close enough to stop modifying it
				if ((this.rightPlayer.pad.height > PLAYERS_HEIGHT - 2) && (this.rightPlayer.pad.height < PLAYERS_HEIGHT + 2))
					this.rightPlayer.pad.height = PLAYERS_HEIGHT;
			}
			if (this.leftPlayer.pad.height < PLAYERS_HEIGHT)
			{
				this.leftPlayer.pad.height *= PLAYER_INCREASE_MULTIPLIER;
				this.leftPlayer.pad.positionY -= PLAYERS_GROWTH_POSITION_FIX;

				// gives PLAYER_HEIGHT to the player when its height is close enough to stop modifying it
				if ((this.leftPlayer.pad.height > PLAYERS_HEIGHT - 2) && (this.leftPlayer.pad.height < PLAYERS_HEIGHT + 2))
					this.leftPlayer.pad.height = PLAYERS_HEIGHT;
			}
		}
	}

	decreasePlayerSize()
	{
		// decreases the right player's height if it has been decreased previously and returns
		if (this.caughtBy[this.SIZE_DECREASE] == 'L' && this.rightPlayer.pad.increased == true && this.rightPlayer.pad.counterDecreaseEffect == false)
		{
			if (this.rightPlayer.pad.height > PLAYERS_HEIGHT)
			{
				// fixes height
				this.rightPlayer.pad.height *= PLAYER_SHRINK_MULTIPLIER;
				this.rightPlayer.pad.positionY += PLAYERS_SHRINK_POSITION_FIX;
				
				// disables all this.rightPlayer ifs in increasePlayerSize() as height must not change anymore
				this.rightPlayer.pad.counterIncreaseEffect = true;
				this.rightPlayer.pad.decreased = true;
			}
			return;
		}

		// decreases the left player's height if it has been decreased previously and returns
		if (this.caughtBy[this.SIZE_DECREASE] == 'R' && this.leftPlayer.pad.increased == true && this.leftPlayer.pad.counterDecreaseEffect == false)
		{
			if (this.leftPlayer.pad.height > PLAYERS_HEIGHT)
			{
				// fixes height
				this.leftPlayer.pad.height *= PLAYER_SHRINK_MULTIPLIER;
				this.leftPlayer.pad.positionY += PLAYERS_SHRINK_POSITION_FIX;

				// disables all this.leftPlayer ifs in increasePlayerSize() as height must not change anymore
				this.leftPlayer.pad.counterIncreaseEffect = true;
				this.leftPlayer.pad.decreased = true;
			}
			return;
		}

		// decreases the left player's height if it is the first bonus taken that modifies the left player's height
		if (this.caughtBy[this.SIZE_DECREASE] == 'R' && this.leftPlayer.pad.height > PLAYERS_MIN_HEIGHT && this.leftPlayer.pad.increased == false)
		{
			this.leftPlayer.pad.decreased = true;
			this.leftPlayer.pad.height *= PLAYER_SHRINK_MULTIPLIER;
			this.leftPlayer.pad.positionY += PLAYERS_SHRINK_POSITION_FIX2;
		}

		// decreases the right player's height if it is the first bonus taken that modifies the right player's height
		else if (this.caughtBy[this.SIZE_DECREASE] == 'L' && this.rightPlayer.pad.height > PLAYERS_MIN_HEIGHT && this.rightPlayer.pad.increased == false)
		{
			this.rightPlayer.pad.decreased = true;
			this.rightPlayer.pad.height *= PLAYER_SHRINK_MULTIPLIER;
			this.rightPlayer.pad.positionY += PLAYERS_SHRINK_POSITION_FIX2;

		}
	}

	increasePlayerSize()
	{
		// increases the left player's height if it has been decreased previously and returns
		if (this.caughtBy[this.SIZE_INCREASE] == 'L' && this.leftPlayer.pad.decreased == true && this.leftPlayer.pad.counterIncreaseEffect == false)
		{
			if (this.leftPlayer.pad.height < PLAYERS_HEIGHT)
			{
				// fixes height
				this.leftPlayer.pad.height *= PLAYER_INCREASE_MULTIPLIER;
				this.leftPlayer.pad.positionY -= PLAYERS_GROWTH_POSITION_FIX;
				
				// disables all this.leftPlayer ifs in decreasePlayerSize() as height must not change anymore
				this.leftPlayer.pad.counterDecreaseEffect = true;
				this.leftPlayer.pad.increased = true;
			}
			return;
		}

		// increases the right player's height if it has been decreased previously and returns
		if (this.caughtBy[this.SIZE_INCREASE] == 'R' && this.rightPlayer.pad.decreased == true && this.rightPlayer.pad.counterIncreaseEffect == false)
		{
			if (this.rightPlayer.pad.height < PLAYERS_HEIGHT)
			{
				// fixes height
				this.rightPlayer.pad.height *= PLAYER_INCREASE_MULTIPLIER;
				this.rightPlayer.pad.positionY -= PLAYERS_GROWTH_POSITION_FIX;
				
				// disables all this.rightPlayer ifs in decreasePlayerSize() as height must not change anymore
				this.rightPlayer.pad.counterDecreaseEffect = true;
				this.rightPlayer.pad.increased = true;
			}
			return;
		}

		// increases the right player's height if it is the first bonus taken that modifies the right player's height
		if (this.caughtBy[this.SIZE_INCREASE] == 'R' && this.rightPlayer.pad.height < PLAYERS_MAX_HEIGHT && this.rightPlayer.pad.decreased == false)
		{
			this.rightPlayer.pad.increased = true;
			this.rightPlayer.pad.height *= PLAYER_INCREASE_MULTIPLIER;
			// this.rightPlayer.pad.positionY -= PLAYERS_GROWTH_POSITION_FIX;
			if ((this.rightPlayer.pad.height + this.rightPlayer.pad.positionY) >= (HEIGHT - PLAYER_TO_BORDER_GAP))
			{
				this.rightPlayer.pad.positionY -= PLAYER_TO_BOTTOM_BORDER_GAP_FIX;
				if (this.rightPlayer.pad.height >= PLAYERS_MAX_HEIGHT )
					this.rightPlayer.pad.positionY = (HEIGHT - PLAYER_TO_BORDER_GAP) - this.rightPlayer.pad.height;
			}
			else if ( this.rightPlayer.pad.positionY <= PLAYER_TO_BORDER_GAP)
				this.rightPlayer.pad.positionY = PLAYER_TO_BORDER_GAP;
			else
				this.rightPlayer.pad.positionY -= PLAYERS_GROWTH_POSITION_FIX;
		}

		// increases the left player's height if it is the first bonus taken that modifies the left player's height
		else if (this.caughtBy[this.SIZE_INCREASE] == 'L' && this.leftPlayer.pad.height < PLAYERS_MAX_HEIGHT && this.leftPlayer.pad.decreased == false)
		{
			this.leftPlayer.pad.increased = true;
			this.leftPlayer.pad.height *= PLAYER_INCREASE_MULTIPLIER;
			if ((this.leftPlayer.pad.height + this.leftPlayer.pad.positionY) >= (HEIGHT - PLAYER_TO_BORDER_GAP))
			{
				this.leftPlayer.pad.positionY -= PLAYER_TO_BOTTOM_BORDER_GAP_FIX;
				if (this.leftPlayer.pad.height >= PLAYERS_MAX_HEIGHT )
					this.leftPlayer.pad.positionY = (HEIGHT - PLAYER_TO_BORDER_GAP) - this.leftPlayer.pad.height;
			}
			else if ( this.leftPlayer.pad.positionY <= PLAYER_TO_BORDER_GAP)
					this.leftPlayer.pad.positionY = PLAYER_TO_BORDER_GAP;
			else
				this.leftPlayer.pad.positionY -= PLAYERS_GROWTH_POSITION_FIX;
		}
	}


	resetBonuses()
	{
		this.leftPlayer.pad.playerSpeedSlowered = false;
		this.rightPlayer.pad.playerSpeedSlowered = false;
		this.leftPlayer.pad.speed = PLAYERS_SPEED;
		this.rightPlayer.pad.speed = PLAYERS_SPEED;

		for (let i = 0; i < NB_BONUS * 2; i++)
			clearTimeout(this.timeOutIDs[i]);
		this.initBonusesVars();
		this.leftPlayer.pad.increased = false;
		this.leftPlayer.pad.decreased = false;
		this.leftPlayer.pad.counterIncreaseEffect = false;
		this.leftPlayer.pad.counterDecreaseEffect = false;
		this.rightPlayer.pad.increased = false;
		this.rightPlayer.pad.decreased = false;
		this.rightPlayer.pad.counterIncreaseEffect = false;
		this.rightPlayer.pad.counterDecreaseEffect = false;

		// if previous shot has been scored with a sniper shot, this var can be set on false now
		this.ball.saveState.dataSaved = false;

		if (this.ball.isFreezed())
			this.gameStartTimer = Date.now();
	}

	bonusesDisplay()
	{
		const millis = (Date.now() - this.gameStartTimer) / 1000;
		if (millis > BONUSES_START)
		{
			for (let i = 0; i < NB_BONUS; i++) {
				if (this.displayBonus[i] && !this.ball.isFreezed()) {
					if (!this.randBonusPosSet[i] && ((this.ball.positionX > RAND_GEN_AREA_X)
						&& (this.ball.positionX < WIDTH - RAND_GEN_AREA_X)))
					{
						this.mapBonus.get(i).sendBonusData(this.ball);
						this.randBonusPosSet[i] = true;
					}
					if (this.randBonusPosSet[i]) {
						if (!this.bonusCountDownLaunched[i]) {
							this.bonusCountDownLaunched[i] = true;
							this.timeOutIDs[i] = setTimeout(() => {
								this.timeOver[i] = true;
							}, BONUS_LIFETIME);
						}
						if (this.bonusCaught[i] || this.timeOver[i]) {
							this.displayBonus[i] = false;
							this._server.to(this.gameId).emit("bonus_despawn");
							this.timeOutIDs[i + 1] = setTimeout(() => {
								if (i < NB_BONUS - 1)
									this.displayBonus[i + 1] = true;
							}, BONUSES_INTERVAL * 1000);
						}
					}
				}
			}
		}
	}

	keyDown(key: string, playerId: string)
	{
		if (playerId == this.leftPlayer.id)
		{
			if (key === 'S')
				this.leftPlayer.pad.keyPressed.S = true;
			if (key === 'W')
				this.leftPlayer.pad.keyPressed.W = true;
		}
		else if (playerId == this.rightPlayer.id)
		{
			if (key === 'S')
				this.rightPlayer.pad.keyPressed.S = true;
			if (key === 'W')
				this.rightPlayer.pad.keyPressed.W = true;
		}
	}

	keyUp(key: string, playerId: string)
	{
		if (playerId == this.leftPlayer.id)
		{
			if (key === 'S')
				this.leftPlayer.pad.keyPressed.S = false;
			if (key === 'W')
				this.leftPlayer.pad.keyPressed.W = false;
		}
		else if (playerId == this.rightPlayer.id)
		{
			if (key === 'S')
				this.rightPlayer.pad.keyPressed.S = false;
			if (key === 'W')
				this.rightPlayer.pad.keyPressed.W = false;
		}
	}

	gameOver() {
		if (this.leftPlayer.score === this.topScore) {
			const playerOne: EndGamePlayer = {
				id: this.leftPlayer.id,
				score: this.leftPlayer.score,
				win: true,
				loose: false,
			}
			const playerTwo: EndGamePlayer = {
				id: this.rightPlayer.id,
				score: this.rightPlayer.score,
				win: false,
				loose: true,
			}
			this._gameService.endGame(playerOne, playerTwo, this._server, this.gameId);
			this.start = false;
			clearInterval(this.timeout);
		}
		else if (this.rightPlayer.score === this.topScore) {
			const playerOne: EndGamePlayer = {
				id: this.leftPlayer.id,
				score: this.leftPlayer.score,
				win: false,
				loose: true,
			}
			const playerTwo: EndGamePlayer = {
				id: this.rightPlayer.id,
				score: this.rightPlayer.score,
				win: true,
				loose: false,
			}
			this._gameService.endGame(playerOne, playerTwo, this._server, this.gameId);
			this.start = false;
			clearInterval(this.timeout);
		}
	}

	setScore()
	{
		if (this.ball.positionX > WIDTH - (this.rightPlayer.pad.width)) {
			this.leftPlayer.score++;
			this.ball.resetBall(this);
			this._server.to(this.gameId).emit("bonus_despawn");
			if (this.bonusCaught[this.SIZE_INCREASE])
				this.playerIncreased = true;
			if (this.bonusCaught[this.SIZE_DECREASE])
				this.playerDecreased = true;
			this.resetBonuses();
			const data = {
				id: this.leftPlayer.id,
				score: this.leftPlayer.score,
			}
			this._server.to(this.gameId).emit('score', data);
			this._server.to(this._gameService.spectateRoom)
				.emit('updateScore', this.gameId, data);
		}
		else if (this.ball.positionX < this.rightPlayer.pad.width) {
			this.rightPlayer.score++;
			this.ball.resetBall(this);							
			this._server.to(this.gameId).emit("bonus_despawn");
			if (this.bonusCaught[this.SIZE_INCREASE])
				this.playerIncreased = true;
			if (this.bonusCaught[this.SIZE_DECREASE])
				this.playerDecreased = true;
			this.resetBonuses();
			const data = {
				id: this.rightPlayer.id,
				score: this.rightPlayer.score
			}
			this._server.to(this.gameId).emit('score', data);
			this._server.to(this._gameService.spectateRoom)
				.emit('updateScore', this.gameId, data);
		}
	}

	
	update()
	{
		this.leftPlayer.pad.update(this);
		this.rightPlayer.pad.update(this);
		this.ball.update(this.leftPlayer, this.rightPlayer, this);
		// this.handleBallInBonusArea();
		if (this.bonusesActivated)
			this.bonusesDisplay();
		this.setScore();
		this.gameOver();
		this.resetPlayersHeight();
	}

	getDrawingData()
	{
		let leftPlayerDrawingData = {
			x: this.leftPlayer.pad.positionX,
			y: this.leftPlayer.pad.positionY,
			width: this.leftPlayer.pad.width,
			height: this.leftPlayer.pad.height,
			color: this.leftPlayer.color
		};
	
		let rightPlayerDrawingData = {
			x: this.rightPlayer.pad.positionX,
			y: this.rightPlayer.pad.positionY,
			width: this.rightPlayer.pad.width,
			height: this.rightPlayer.pad.height,
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
		const ball: Partial<Ball> = ballDrawingData;
		const game = { paddles, ball };
		return (game);
	}

	initMapBonuses()
	{
		this.mapBonus.set(this.SIZE_DECREASE,
			new Bonus("SIZE_DECREASE", this.SIZE_DECREASE, this.gameId, this._server));

		this.mapBonus.set(this.SIZE_INCREASE,
			new Bonus("SIZE_INCREASE", this.SIZE_INCREASE, this.gameId, this._server));

		this.mapBonus.set(this.REVERSE_KEYS_BONUS,
			new Bonus("REVERSE_KEYS_BONUS", this.REVERSE_KEYS_BONUS, this.gameId, this._server));
		
		this.mapBonus.set(this.SLOWER_BONUS,
			new Bonus("SLOWER_BONUS", this.SLOWER_BONUS, this.gameId, this._server));
		
		this.mapBonus.set(this.SNIPER_BONUS,
			new Bonus("SNIPER_BONUS", this.SNIPER_BONUS, this.gameId, this._server));
	}

	genSingleRandNumber(tab: number[])
	{
		let nb = Math.floor(Math.random() * NB_BONUS); // generate random number from 0 to 4
		while (tab.indexOf(nb) != -1) // while nb is in tab
			nb = Math.floor(Math.random() * NB_BONUS); // generate new number
		return (nb);
	}

	setRandBonusesOrder()
	{
		let tab:number[] = [];
		
		this.SIZE_DECREASE = this.genSingleRandNumber(tab);
		tab.push(this.SIZE_DECREASE);
		
		this.SIZE_INCREASE = this.genSingleRandNumber(tab);
		tab.push(this.SIZE_INCREASE);
		
		this.REVERSE_KEYS_BONUS = this.genSingleRandNumber(tab);
		tab.push(this.REVERSE_KEYS_BONUS);
		
		this.SLOWER_BONUS = this.genSingleRandNumber(tab);
		tab.push(this.SLOWER_BONUS);
		
		this.SNIPER_BONUS = this.genSingleRandNumber(tab);
		tab.push(this.SNIPER_BONUS);
	}

	initBonusesVars()
	{
		this.setRandBonusesOrder();
		this.initMapBonuses();
		for (let i = 0; i < NB_BONUS * 2; i++)
		{
			if (i < NB_BONUS)
			{
				this.timeOver[i] = false;
				this.caughtBy[i] = "no one";
				this.bonusCaught[i] = false;
				this.randBonusPosSet[i] = false;
				this.bonusCountDownLaunched[i] = false;
			}

			if (i === 0)
				this.displayBonus[i] = true;
			else
				this.displayBonus[i] = false;
		}
	}

	gameLoop()
	{
		this.timeout = setInterval(() => {
			if (!this.start) return;
			this._server.to(this.gameId).emit("update", this.getDrawingData());
			this.update();
		}, TICK_INTERVAL);
	}

	runGame()
	{
		this.initBonusesVars();
		this.gameStartTimer = Date.now();
		this.gameLoop();
	}

	// POUR TEST REDA
	resetgame() {
		this.leftPlayer.score = 0
		this.rightPlayer.score = 0
		this.ball.positionX = 0
		this.ball.positionY = 0
		this.leftPlayer.pad.positionY = HEIGHT / 2 - this.leftPlayer.pad.height / 2
		this.rightPlayer.pad.positionY = HEIGHT / 2 - PLAYERS_HEIGHT / 2
		this.updateObjectsPos()
	}

	updateObjectsPos() {
		// WIDTH = canvasWrapper.offsetWidth;
		// HEIGHT = canvasWrapper.offsetHeight;
	
		this.ball.positionX = WIDTH / 2 - START_BALL_RADIUS / 2
		this.ball.positionY = HEIGHT / 2 - START_BALL_RADIUS / 2
	
		this.rightPlayer.pad.positionX = WIDTH - (PLAYERS_WIDTH + 10)
	
		if (this.leftPlayer.score === 0 && this.rightPlayer.score === 0) {
			this.leftPlayer.pad.positionY = HEIGHT / 2 - PLAYERS_HEIGHT / 2
			this.rightPlayer.pad.positionY = HEIGHT / 2 - PLAYERS_HEIGHT / 2
		}
	}
}
