import { Entity } from "./entity.entities";

export class Ball extends Entity {
	constructor(x: number, y: number) {
		super(x, y);
	}

	move(): void {}
}