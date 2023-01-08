import { Socket } from 'socket.io';

export class _sockets {
	private _sockets: Map<string, Socket> = new Map();

	public set(id: string, socket: Socket) {
		this._sockets.set(id, socket);
	}

	public get(id: string) {
		return this._sockets.get(id);
	}

	public delete(id: string) {
		this._sockets.delete(id);
	}
}

export const UserIdToSockets = new _sockets();