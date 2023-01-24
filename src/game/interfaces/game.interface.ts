export interface Player {
	id?: string,
	username?: string,
	avatar?: string,
	score?: number,
	level?: number,
	experience?: number,
	next_level?: number,
}

export interface Players {
	left?: Player,
	right?: Player,
}

export interface StartInfo {
	players: Players,
	width: number,
	height: number,
	startTime?: number,
}

export interface GamesRequest {
	sender: {
		id: string,
		accept: boolean,
	},
	receiver: {
		id: string,
		accept: boolean,
	},
	bonus: boolean,
	matchmaking: boolean,
	startTime: number,
	timeup: number,

	timer: NodeJS.Timeout,
}

export interface Paddles {
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

export interface Ball {
	x: number,
	y: number,
	radius: number,
	color: string,
}

export interface EndGamePlayer {
	id: string,
	score: number,
	win: boolean,
	loose: boolean,
}
