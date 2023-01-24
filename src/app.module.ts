import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import ChannelModule from './channel/channel.module';
import GameModule from './game/game.module';


@Module({
    imports: [
		ServeStaticModule.forRoot({
			rootPath: join(__dirname, '..', 'data'),
			exclude: ['/api*'],
		}),
        UsersModule,
        AuthModule,
		ChannelModule,
		GameModule,
    ],
})
export class AppModule {}
