import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  console.log(`NestJS example listening on http://localhost:${port}`);
  console.log('  GET    /documents      — Document:Query');
  console.log('  POST   /documents      — Document:Create');
  console.log('  PUT    /documents/:id  — Document:Update');
  console.log('  PATCH  /documents/:id  — Document:Update');
  console.log('  DELETE /documents/:id  — Document:Delete');
  console.log('Use Authorization: Bearer <token> or set GRANT_TOKEN in .env');
}

bootstrap();
