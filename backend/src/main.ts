import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { leerConfigMercado } from './config/mercado.config';

async function bootstrap(): Promise<void> {
  const config = leerConfigMercado();
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });
  app.enableCors({ origin: config.corsOrigin });
  await app.listen(config.port);
  new Logger('Bootstrap').log(`Backend de mercado escuchando en http://localhost:${config.port}`);
}

void bootstrap();
