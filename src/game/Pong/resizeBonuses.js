Pong.prototype.decreasePlayerSize = function()
{
	// decreases the right player's height if it has been decreased previously and returns
	if (this.caughtBy[SIZE_DECREASE] == 'L' && this.rightPlayer.increased == true && this.rightPlayer.counterDecreaseEffect == false)
	{
		if (this.rightPlayer.height > PLAYERS_HEIGHT)
		{
			// fixes height
			this.rightPlayer.height *= PLAYER_SHRINK_MULTIPLIER;
			this.rightPlayer.positionY += PLAYERS_SHRINK_POSITION_FIX;
			
			// disables all this.rightPlayer ifs in increasePlayerSize() as height must not change anymore
			this.rightPlayer.counterIncreaseEffect = true;
			this.rightPlayer.decreased = true;
		}
		return;
	}

	// decreases the left player's height if it has been decreased previously and returns
	if (this.caughtBy[SIZE_DECREASE] == 'R' && this.leftPlayer.increased == true && this.leftPlayer.counterDecreaseEffect == false)
	{
		if (this.leftPlayer.height > PLAYERS_HEIGHT)
		{
			// fixes height
			this.leftPlayer.height *= PLAYER_SHRINK_MULTIPLIER;
			this.leftPlayer.positionY += PLAYERS_SHRINK_POSITION_FIX;

			// disables all this.leftPlayer ifs in increasePlayerSize() as height must not change anymore
			this.leftPlayer.counterIncreaseEffect = true;
			this.leftPlayer.decreased = true;
		}
		return;
	}

	// decreases the left player's height if it is the first bonus taken that modifies the left player's height
	if (this.caughtBy[SIZE_DECREASE] == 'R' && this.leftPlayer.height > PLAYERS_MIN_HEIGHT && this.leftPlayer.increased == false)
	{
		this.leftPlayer.decreased = true;
		this.leftPlayer.height *= PLAYER_SHRINK_MULTIPLIER;
		this.leftPlayer.positionY += PLAYERS_SHRINK_POSITION_FIX2;
	}

	// decreases the right player's height if it is the first bonus taken that modifies the right player's height
	else if (this.caughtBy[SIZE_DECREASE] == 'L' && this.rightPlayer.height > PLAYERS_MIN_HEIGHT && this.rightPlayer.increased == false)
	{
		this.rightPlayer.decreased = true;
		this.rightPlayer.height *= PLAYER_SHRINK_MULTIPLIER;
		this.rightPlayer.positionY += PLAYERS_SHRINK_POSITION_FIX2;

	}
}

Pong.prototype.increasePlayerSize = function()
{
	// increases the left player's height if it has been decreased previously and returns
	if (this.caughtBy[SIZE_INCREASE] == 'L' && this.leftPlayer.decreased == true && this.leftPlayer.counterIncreaseEffect == false)
	{
		if (this.leftPlayer.height < PLAYERS_HEIGHT)
		{
			// fixes height
			this.leftPlayer.height *= PLAYER_INCREASE_MULTIPLIER;
			this.leftPlayer.positionY -= PLAYERS_GROWTH_POSITION_FIX;
			
			// disables all this.leftPlayer ifs in decreasePlayerSize() as height must not change anymore
			this.leftPlayer.counterDecreaseEffect = true;
			this.leftPlayer.increased = true;
		}
		return;
	}

	// increases the right player's height if it has been decreased previously and returns
	if (this.caughtBy[SIZE_INCREASE] == 'R' && this.rightPlayer.decreased == true && this.rightPlayer.counterIncreaseEffect == false)
	{
		if (this.rightPlayer.height < PLAYERS_HEIGHT)
		{
			// fixes height
			this.rightPlayer.height *= PLAYER_INCREASE_MULTIPLIER;
			this.rightPlayer.positionY -= PLAYERS_GROWTH_POSITION_FIX;
			
			// disables all this.rightPlayer ifs in decreasePlayerSize() as height must not change anymore
			this.rightPlayer.counterDecreaseEffect = true;
			this.rightPlayer.increased = true;
		}
		return;
	}

	// increases the right player's height if it is the first bonus taken that modifies the right player's height
	if (this.caughtBy[SIZE_INCREASE] == 'R' && this.rightPlayer.height < PLAYERS_MAX_HEIGHT && this.rightPlayer.decreased == false)
	{
		this.rightPlayer.increased = true;
		this.rightPlayer.height *= PLAYER_INCREASE_MULTIPLIER;
		this.rightPlayer.positionY -= PLAYERS_GROWTH_POSITION_FIX;
	}

	// increases the left player's height if it is the first bonus taken that modifies the left player's height
	else if (this.caughtBy[SIZE_INCREASE] == 'L' && this.leftPlayer.height < PLAYERS_MAX_HEIGHT && this.leftPlayer.decreased == false)
	{
		this.leftPlayer.increased = true;
		this.leftPlayer.height *= PLAYER_INCREASE_MULTIPLIER;
		this.leftPlayer.positionY -= PLAYERS_GROWTH_POSITION_FIX;
	}
}