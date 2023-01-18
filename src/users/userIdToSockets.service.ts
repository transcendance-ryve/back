import { Socket, Server } from 'socket.io';

export class _sockets {
	private _sockets: Map<string, Socket> = new Map();

	public set(id: string, socket: Socket) {
		// if (this._sockets.has(id)) {
		// 	this._sockets.get(id).push(socket);
		// } else {
		this._sockets.set(id, socket);
		//}
	}

	public get(id: string) {
		return this._sockets.get(id);
	}

	public delete(id: string) {
		this._sockets.delete(id);
	}

	/*public emit(id: string, server: Server, event: string, ...args: any[]) {
		this._sockets.get(id).forEach((socket) => {
			server.to(socket.id).emit(event, ...args);
		});
	}*/
}

export const UserIdToSockets = new _sockets();