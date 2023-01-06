import { Injectable, UnauthorizedException } from "@nestjs/common";
import { UsersService } from "src/users/users.service";
import { Socket } from 'socket.io';


interface PendingGame {
	senderID: string;
	senderAccepted: boolean;

	receiverID: string;
	receiverAccepted: boolean;	
}

@Injectable()
export class GameService {
	constructor(
		private readonly _usersService: UsersService,
	) {}

	private _matchmakingQueue: Socket[] = [];
	private _pendingGame: PendingGame[] = [];

	joinMatchmaking(socket: Socket): void {
		this._matchmakingQueue.push(socket);
	}

	findOpponent() {
		const usersInQueue = this._matchmakingQueue.length;

		if (usersInQueue < 2)
			return;

		

	}

	// acceptGame(id: string) : void {
	// 	const gameRequestIndex = this._gameRequests.findIndex(gameRequest => gameRequest.senderID === id || gameRequest.receiverID === id);
	// 	if (gameRequestIndex === -1)
	// 		return;
		
	// 	const gameRequest = this._gameRequests[gameRequestIndex];
	// 	if (gameRequest.senderID === id)
	// 		gameRequest.senderAccepted = true;
	// 	else
	// 		gameRequest.receiverAccepted = true;
		
	// 	if (gameRequest.senderAccepted && gameRequest.receiverAccepted) {
	// 		// TODO: Create game
	// 		// TODO: Remove users from matchmaking
	// 		// TODO: Remove game request
	// 	}
	// }

	// declineGame(id: string) {
	// 	const gameRequestIndex = this._gameRequests.findIndex(gameRequest => gameRequest.senderID === id || gameRequest.receiverID === id);
	// 	if (gameRequestIndex === -1)
	// 		return;

	// 	const gameRequest = this._gameRequests[gameRequestIndex];
		
	// 	const opponent = (gameRequest.senderID === id)
	// 		? gameRequest.receiverID
	// 		: gameRequest.senderID;
		
	// 	this._gameRequests.splice(gameRequestIndex, 1);
	
	// 	return opponent;
	// }
}