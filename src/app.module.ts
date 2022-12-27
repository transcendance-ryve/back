import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';


@Module({
    imports: [
		ServeStaticModule.forRoot({
			rootPath: join(__dirname, '..', 'data', 'avatars')
		}),
        UsersModule,
        AuthModule,
    ],
})
export class AppModule {}
