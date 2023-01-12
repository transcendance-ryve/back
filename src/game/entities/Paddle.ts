import { Entity } from "./Object";

export class Paddle extends Entity {
	constructor(x: number, y: number) {
		super(x, y);

		this._height = 100;
	}

	private _width: number = 20;
	private _height: number;

	getWidth(): number {
		return this._width;
	}

	getHeight(): number {
		return this._height;
	}

	setHeight(height: number): void {
		this._height = height;
	}

	moveUp(): void {}

	moveDown(): void {}
}