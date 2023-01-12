export class Entity {
	constructor(x = 0, y = 0) {
		this._x = x;
		this._y = y;
	}

	private _x: number;
	private _y: number;
}