import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from 'src/prisma.service';
import { join } from 'path';

@Module({
	imports: [
		ServeStaticModule.forRoot({
			rootPath: join(__dirname, '..', 'data', 'avatars')
		}),
	],
    controllers: [UsersController],
    providers: [UsersService, PrismaService],
    exports: [UsersService]
})
export class UsersModule {}
