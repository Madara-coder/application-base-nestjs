import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { setupApp } from './app.setup.js';

async function bootstrap() {
  const app = setupApp(await NestFactory.create(AppModule));
  const config = app.get(ConfigService);

  await app.listen(config.getOrThrow<number>('app.port'));
}
await bootstrap();
