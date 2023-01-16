/*const color =
{
	blue: "blue",
	red: "red"
}

const gameStatus =
{
	inGame: "inGame",
	won: "won",
	lost: "lost"
}

const playerStatus =
{
	connected: "connected",
	disconnected: "disconnected"
}

class Entity
{
	constructor() {};
	positionX: number;
	positionY: number;
	height: number;
	width: number;
}

class Paddle extends Entity
{
	constructor(color: string)
	{
		super();
		this.color = color;
		this.init();
	};

	public color: string;
	private speed: number = PLAYERS_SPEED;

	private init()
	{
		if (this.color === color.blue)
			this.positionX = 10;
		else if (this.color === color.red)
			this.positionX = canvas.width - (10 + PLAYERS_WIDTH);

		this.positionY = canvas.height / 2 - PLAYERS_HEIGHT / 2;
		this.height = PLAYERS_HEIGHT;
		this.width = PLAYERS_WIDTH;
		this.speed = PLAYERS_SPEED;
	}

	keyPressed = {
		W: false,
		Z: false
	}
	// moveUp();
	// moveDown();
	// update();
}

class Player
{
	constructor(playerID: string, color: string)
	{
		this.id = playerID;
		this.color = color;
		this.pad = new Paddle(this.color);
	}

	id: string;
	color: string;
	gameStatus: string = gameStatus.inGame;
	playerStatus: string = playerStatus.connected;
	points: number = 0;
	bonuses: boolean[] = [
		false,
		false,
		false,
		false,
		false
	];
	penalties: boolean[] = [
		false,
		false,
		false,
		false,
		false
	];

	pad: Paddle;
}

function randomNb(min: number, max: number): number
{
	let randomNumber: number = min + Math.random() * (max - min);
	return (randomNumber);
}

class Ball extends Entity
{
	constructor()
	{
		super();
		this.init();
	}

	velocityX: number;
	velocityY: number;
	color: string;
	lastPlayerTouchingBall: string;
	speed: number;

	saveState = {
		copyVelX: 0,
		copyVelY: 0
	}

	keyPressed = {
		W: false,
		Z: false
	}

	vel = {
		x: 0,
		y: 0
	}

	blue = {
		color: color.blue,
		velocity: this.vel
	}

	red = {
		color: color.red,
		velocity: this.vel
	}

	sides = [
		this.blue,
		this.red
	]

	init()
	{
		this.height = 
		this.width =
		this.positionX = canvas.width / 2 - this.width / 2;
		this.positionY = canvas.height / 2 - this.height / 2;
		this.velocityX = START_BALL_SPEED;
		this.velocityY = START_BALL_SPEED;
		this.generateRandDirection();

	};
	generateRandDirection()
	{
			if (randomNb(0, 1) > 0.5)
				this.velocityX = -this.velocityX;
			if (randomNb(0, 1) > 0.5)
				this.velocityY = -this.velocityY;
			if (this.velocityX < 0)
				this.color = color.red;
			else
				this.color = color.blue;
	};

	toggleColor(): void
	{
		if (this.color === color.red)
			this.color = color.blue;
		else if (this.color === color.blue)
			this.color = color.red;
	};

	resetBallVel(): void
	{
		this.velocityX = this.saveState.copyVelX; // ancienne version -> this.velocityX = -this.saveState.copyVelX;
	
		// makes the ball fall down after sniper shot
		if (this.saveState.copyVelY > 0)
			this.velocityY = this.saveState.copyVelY;
		else if (this.saveState.copyVelY < 0)
			this.velocityY = -this.saveState.copyVelY;
	
		this.saveState.copyVelX = 0;
		this.saveState.copyVelY = 0;
	};

	// move(); // fait bouger x ou y;
	// update(); //  checks collision et si un point est marqué (balle a depassé les paddles gauche et droit)
}

class Bonus extends Entity {

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
}

class Game 
{
	constructor(leftPlayerID: string, rightPlayerID: string)
	{
		this.leftPlayer = new Player(leftPlayerID, color.blue);
		this.rightPlayer = new Player(rightPlayerID, color.blue);
	}

	ball = new Ball();
	bonuses = [
		new Bonus("SIZE_DECREASE", "../bonuses_images/game-controller.svg"),
		new Bonus("SIZE_INCREASE", "../bonuses_images/friends.svg"),
		new Bonus("REVERSE_KEYS_BONUS", "../bonuses_images/bell.svg"),
		new Bonus("SLOWER_BONUS", "../bonuses_images/Play.svg"),
		new Bonus("SNIPER_BONUS", "../bonuses_images/Eye.svg"),
	];

	leftPlayer: Player;
	rightPlayer: Player;

	// generateBonusSurMap();
	// removeBonusSurMap();
	update()
	{
		this.ball.update();
		this.leftPlayer.pad.update();
		this.rightPlayer.pad.update();
	} // sert a savoir si la balle est sur un bonus, un paddle, key pressed ou non lors de la collision etc...
	// 			// appelle les fonctions update des autres objets
	// save(); // pour le match history, on l'appelle a la fin du match

}*/