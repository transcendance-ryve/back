export const color =
{
	blue: "#0177FB",
	red: "#FF4646"
}

export const gameStatus =
{
	inGame: "inGame",
	won: "won",
	lost: "lost"
}

export const playerStatus =
{
	connected: "connected",
	disconnected: "disconnected"
}

export function randomNb(min: number, max: number): number
{
	let randomNumber: number = min + Math.random() * (max - min);
	return (randomNumber);
}

export const HEIGHT: number = 390;
export const WIDTH: number = 790;

export const	TICK_INTERVAL: number = 1000/60;		// interval of time between each frame

export const	START_BALL_SPEED: number = 3;

export const	BALL_SPEED_MULTIPLIER: number = 1.1;

export const	PLAYER_INCREASE_MULTIPLIER: number = 1.05;
export const	PLAYERS_GROWTH_POSITION_FIX: number = 2.1;
export const	PLAYER_SHRINK_MULTIPLIER: number = 0.95;
export const	PLAYERS_SHRINK_POSITION_FIX: number = 2.4;

export const	PLAYERS_SHRINK_POSITION_FIX2: number = 1.8;

export const	MAX_BALL_SPEED: number = 10;
export const	PLAYERS_SPEED: number = 7;

export const	BONUS_HEIGHT: number = 40;
export const	BONUS_WIDTH: number = 40;
export const	X_BONUS_LIMIT: number = 200;
export const	Y_BONUS_LIMIT: number = 10;

export const	PLAYERS_HEIGHT:number = HEIGHT / 4;
export const	PLAYERS_WIDTH:number = HEIGHT / 100;
export const	PLAYERS_MAX_HEIGHT = PLAYERS_HEIGHT * 1.5;
export const	PLAYERS_MIN_HEIGHT = PLAYERS_HEIGHT * 0.5;
export const	PLAYER_TO_BORDER_GAP: number = 7;
export const	PLAYER_TO_BOTTOM_BORDER_GAP_FIX: number = 5.4;

export const	START_BALL_RADIUS:number = HEIGHT / 45;

export const	NB_BONUS: number = 5;
export const	BONUSES_START: number = 0; // in seconds
export const	BONUSES_INTERVAL: number = 5; // in s
export const	BONUS_LIFETIME: number = 20 * 1000; // in s

export const	RAND_GEN_AREA_X: number = X_BONUS_LIMIT + BONUS_WIDTH + 10;
export const	SNIPER_SPEED_UP_EFFECT_X: number = 15;
export const	SNIPER_SPEED_UP_EFFECT_Y: number = 5;


export const	SIZE_DECREASE_PATH: string = "http://localhost:3000/game/reduce.svg";
export const	SIZE_INCREASE_PATH: string = "http://localhost:3000/game/extend.svg";
export const	REVERSE_KEYS_BONUS_PATH: string = "http://localhost:3000/game/reverse.svg";
export const	SLOWER_BONUS_PATH: string = "http://localhost:3000/game/slow.svg";
export const	SNIPER_BONUS_PATH: string = "http://localhost:3000/game/sniper.svg";