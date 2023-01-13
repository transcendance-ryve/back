/*import { Socket } from "socket.io";
import { Ball } from "./ball.entities";
import { Player } from "./player.entities";
import { v4 as cuid } from "cuid";

enum Status {
	Waiting,
	Playing,
	Finished
}

export class Game {
	constructor(server: Socket) {
		this._roomID = cuid();
		this._ball = new Ball(0, 0);
		this._status = Status.Waiting;

		setInterval(this._update, 1000 / 60);
	}

	private _roomID: string;
	private _playerOne: Player;
	private _playerTwo: Player;
	private _status: Status;
	private _ball: Ball;

	private _update(): void {
		if (this._status !== Status.Waiting)
			return;

		this._ball.move();
	}

	getRoomID(): string {
		return this._roomID;
	}

	getStatus(): Status {
		return this._status;
	}



	getPlayerOne(): Player {
		return this._playerOne;
	}
	
	setPlayerOne(player: Player): void {
		this._playerOne = player;
	}
	


	getPlayerTwo(): Player {
		return this._playerTwo;
	}

	setPlayerTwo(player: Player): void {
		this._playerTwo = player;
	}
}*/