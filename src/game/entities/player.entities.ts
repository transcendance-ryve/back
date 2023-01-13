import { Entity } from "./entity.entities";
import { Paddle } from "./paddle.entites";

export class Player extends Entity {
	constructor(id: string, x: number, y: number) {
		super(x, y);

		this._id = id;
		this._point = 0;
	}

	private	_id: string;
	private	_point: number;
	protected paddle: Paddle;

	setPoint(point: number): void {
		this._point = point;
	}

	getPoint(): number {
		return this._point;
	}
}