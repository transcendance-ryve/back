export class Entity {
	constructor(x = 0, y = 0) {
		this._x = x;
		this._y = y;
	}

	_x: number;
	_y: number;
	_width: number;
	_height: number;
}