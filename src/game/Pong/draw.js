
/**
 * Draw
 */

Pong.prototype.ftRoundRect = function (player)		// same behavior as context.roundRect (which doesn't work with firefox)
{
	const top = player.positionY;
	const left = player.positionX;
	const width = player.width;
	const height = player.height;
	const radius = 2;
	context.beginPath();
	context.strokeStyle = player.color;
	context.moveTo(left + radius, top);
	context.lineTo(left + width - radius, top);
	context.arcTo(left + width, top, left + width, top + radius, radius);
	context.lineTo(left + width, top + height - radius);
	context.arcTo(left + width, top + height, left + width - radius, top + height, radius);
	context.lineTo(left + radius, top + height);
	context.arcTo(left, top + height, left, top + height - radius, radius);
	context.lineTo(left, top + radius);
	context.arcTo(left, top, left + radius, top, radius);
	context.stroke();
}

Pong.prototype.drawLeftPlayer = function () {
	context.beginPath();
	context.fillStyle = this.leftPlayer.color;
	this.ftRoundRect(this.leftPlayer);
	context.fill();
	context.closePath();
}

Pong.prototype.drawRightPlayer = function () {
	context.beginPath();
	context.fillStyle = this.rightPlayer.color;
	this.ftRoundRect(this.rightPlayer);
	context.fill();
	context.closePath();
}

Pong.prototype.drawBall = function () {
	context.beginPath();
	context.fillStyle = this.ball.color;
	context.arc(this.ball.positionX, this.ball.positionY, this.ball.radius, 0, Math.PI * 2);
	context.fill();
	context.closePath();
}

Pong.prototype.drawBonus = function () {
	const millis = (Date.now() - this.start) / 1000;
	if (millis > BONUSES_START) {
		for (let i = 0; i < NB_BONUS; i++) {
			if (this.displayBonus[i] && !this.ballFreezed) {
				if (!this.randBonusPosSet[i] && ((this.ball.positionX > RAND_GEN_AREA_X)
					&& (this.ball.positionX < canvas.width - RAND_GEN_AREA_X))) {
					this.setRandBonusPos();
					this.randBonusPosSet[i] = true;
				}
				if (this.randBonusPosSet[i]) {
					context.drawImage(this.bonus.mapBonusImages.get(i), this.bonus.positionX, this.bonus.positionY, this.bonus.height, this.bonus.width);
					if (!this.bonusCountDownLaunched[i]) {
						this.bonusCountDownLaunched[i] = true;
						this.timeOutIDs[i] = setTimeout(() => {
							this.timeOver[i] = true;
						}, this.bonusLifetimes[i]);
					}
					if (this.bonusCaught[i] || this.timeOver[i]) {
						this.displayBonus[i] = false;
						this.timeOutIDs[i + 1] = setTimeout(() => {
							if (i < NB_BONUS - 1)
								this.displayBonus[i + 1] = true;
						}, BONUSES_INTERVAL * 1000);
					}
				}
			}
		}
	}
}

Pong.prototype.drawAll = function () {
	// Clear and draws objects
	context.clearRect(0, 0, canvas.width, canvas.height);
	this.drawLeftPlayer();
	this.drawRightPlayer();
	this.drawBall();
	this.drawBonus();
}



// Get drawing data to be sent to the front
/*
Pong.prototype.getCanvasDimensions = function () {
	canvasDimensions = {
		height: 390,
		width: 790
	}
	return (canvasDimensions);
}

Pong.prototype.getDrawingData = function () {

	let leftPlayerDrawingData = {
		positionY: this.leftPlayer.positionY,
		positionX: this.leftPlayer.positionX,
		width: this.leftPlayer.width,
		height: this.leftPlayer.height,
		color: this.leftPlayer.color
	};

	let rightPlayerDrawingData = {
		positionY: this.rightPlayer.positionY,
		positionX: this.rightPlayer.positionX,
		width: this.rightPlayer.width,
		height: this.rightPlayer.height,
		color: this.rightPlayer.color
	};


	let ballDrawingData = {
		positionX: this.ball.positionX,
		positionY: this.ball.positionY,
		radius: this.ball.radius,
		color: this.ball.color
	};

	let drawingData = { leftPlayerDrawingData, rightPlayerDrawingData, ballDrawingData };

	return (drawingData);
}*/
