import { ChannelType } from '@prisma/client';

export interface UserTag {
	id: string;
	username: string;
	avatar: string;
	role: string;
	isMute: boolean;
	isBan: boolean;
}

export interface InvitaionTag {
	id: string;
	name: string;
	status: ChannelType;
	usersCount: number;
}

export interface MessageTag {
	content: string;
	createdAt: Date;
	sender: {
		id: string,
		username: string,
		avatar: string,
	}
}

export interface Messages {
	messages: MessageTag[];
	total: number;
}
