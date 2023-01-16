import { Server } from "socket.io";
import { GameService } from "../game.service";
import { Paddles } from "../interfaces/game.interface";
import { Player } from "./Player.entities";
import { color, WIDTH, SIZE_INCREASE, SIZE_DECREASE } from "./utils.entities";
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
	}

	_gameService: GameService;
	_server: Server;
	gameId: string;

	ball = new Ball();
	/*bonuses = [
		new Bonus("SIZE_DECREASE", "../bonuses_images/game-controller.svg"),
		new Bonus("SIZE_INCREASE", "../bonuses_images/friends.svg"),
		new Bonus("REVERSE_KEYS_BONUS", "../bonuses_images/bell.svg"),
		new Bonus("SLOWER_BONUS", "../bonuses_images/Play.svg"),
		new Bonus("SNIPER_BONUS", "../bonuses_images/Eye.svg"),
	];*/

	leftPlayer: Player;
	rightPlayer: Player;

	// generateBonusSurMap();
	// removeBonusSurMap();
	update()
	{
		this.ball.update(this.leftPlayer, this.rightPlayer);
		this.setScore();
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

	updateKeyPress()
	{
		this.leftPlayer.pad.standardKeysBehavior();
		this.rightPlayer.pad.standardKeysBehavior();
	}

	launchGame()
	{
		this.gameLoop();
	}

	async gameLoop()
	{
		this.updateKeyPress();
		this._server.to(this.gameId).emit("update", this.getDrawingData());
		this.update();
		setTimeout(async () => {this.gameLoop();}, 16);
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

	setScore() {
		if (this.ball.positionX > WIDTH - (this.rightPlayer.pad.width)) {
			this.leftPlayer.score++;
			this.ball.color = this.rightPlayer.color;
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
			console.log("score: " + this._gameService.spectateRoom);
			this._server.to(this._gameService.spectateRoom)
				.emit('updateScore', this.gameId, data);
		}
		else if (this.ball.positionX < this.rightPlayer.pad.width) {
			this.rightPlayer.score++;
			this.ball.color = this.leftPlayer.color;
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
			console.log("score: " + this._gameService.spectateRoom);
			this._server.to(this._gameService.spectateRoom)
				.emit('updateScore', this.gameId, data);
		}
	}
}