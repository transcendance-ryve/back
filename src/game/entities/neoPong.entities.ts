import { Server } from "socket.io";
import { GameService } from "../game.service";
import { Paddles, EndGamePlayer } from "../interfaces/game.interface";
import { Player } from "./Player.entities";
import { color, WIDTH, HEIGHT, PLAYERS_HEIGHT, PLAYERS_WIDTH, START_BALL_RADIUS, TICK_INTERVAL } from "./utils.entities";
import { Ball } from "./Ball.entities";


/*class Bonus extends Entity {

	constructor(effect: string, imSrc: string){
		super();
		this.effect = effect;
		this.image = new Image();
		this.image.src = imSrc;
	}
	effect: string;
	image: HTMLImageElement;
	lifetime: number = BONUS_LIFETIME;

	// update(); // check si la balle est sur le bonus
}*/

export class Pong
{
	constructor(gameId:string, leftPlayerID: string,
		rightPlayerID: string, _server: Server, _gameService: GameService)
	{
		this.leftPlayer = new Player(leftPlayerID, color.blue);
		this.rightPlayer = new Player(rightPlayerID, color.red);
		this._gameService = _gameService;
		this._server = _server;
		this.gameId = gameId;
		this.start = true;
	}

	destructor(){
		delete(this.ball);
		delete(this.leftPlayer);
		delete(this.rightPlayer);
	}

	_gameService: GameService;
	_server: Server;
	gameId: string;
	topScore: number = 2;
	start: boolean = false;
	timeout: NodeJS.Timeout;

	/*bonuses = [
		new Bonus("SIZE_DECREASE", "../bonuses_images/game-controller.svg"),
		new Bonus("SIZE_INCREASE", "../bonuses_images/friends.svg"),
		new Bonus("REVERSE_KEYS_BONUS", "../bonuses_images/bell.svg"),
		new Bonus("SLOWER_BONUS", "../bonuses_images/Play.svg"),
		new Bonus("SNIPER_BONUS", "../bonuses_images/Eye.svg"),
	];*/

	ball = new Ball();
	leftPlayer: Player;
	rightPlayer: Player;

	// generateBonusSurMap();
	// removeBonusSurMap();

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
			clearInterval(this.timeout);
			this._gameService.endGame(playerOne, playerTwo, this._server, this.gameId);
			this.start = false;
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
			clearInterval(this.timeout);
			this._gameService.endGame(playerOne, playerTwo, this._server, this.gameId);
			this.start = false;
		}
	}

	setScore() {
		if (this.ball.positionX > WIDTH - (this.rightPlayer.pad.width)) {
			this.leftPlayer.score++;
			this.ball.resetBall();
			// //if (this.bonusCaught[SIZE_INCREASE])
			// 	this.playerIncreased = true;
			// if (this.bonusCaught[SIZE_DECREASE])
			// 	this.playerDecreased = true;
			// //this.resetBonuses();
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
			this.ball.resetBall();
			// if (this.bonusCaught[SIZE_INCREASE])
			// 	this.playerIncreased = true;
			// if (this.bonusCaught[SIZE_DECREASE])
			// 	this.playerDecreased = true;
			// this.resetBonuses();
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
		// this.updateKeyPress();
		this.leftPlayer.pad.update();
		this.rightPlayer.pad.update();
		this.ball.update(this.leftPlayer, this.rightPlayer);
		this.setScore();
		this.gameOver();
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

	runGame()
	{
		this.timeout = setInterval(() => {
			if (!this.start) return;
			this._server.to(this.gameId).emit("update", this.getDrawingData());
			this.update();
		}, TICK_INTERVAL);
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
