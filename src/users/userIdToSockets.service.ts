import { Socket, Server } from 'socket.io';

export class _sockets {
	private _sockets: Map<string, Socket[]> = new Map();

	public set(id: string, socket: Socket) {
		this._sockets.set(id, this._sockets.has(id) ? [...this._sockets.get(id), socket] : [socket]);
	}

	public get(id: string) {
		return this._sockets.get(id);
	}

	public delete(id: string, socket: Socket) {
		const sockets = this._sockets.get(id);

		if (sockets.length >= 1) {
			const index = sockets.findIndex((s) => s.id === socket.id);
			sockets.splice(index, 1);
		}
		if (sockets.length === 0)
			this._sockets.delete(id);
	}

	public emit(id: string, server: Server, event: string, ...args: any[]) {
		this._sockets?.get(id)?.forEach((socket) => {
			server.to(socket.id).emit(event, ...args);
		});
	}
}

export const UserIdToSockets = new _sockets();