import { Entity } from "./entity.entities";

export class Paddle extends Entity {
	constructor(x: number, y: number) {
		super(x, y);

	}

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