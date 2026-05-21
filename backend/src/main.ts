import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AwsService } from './AWS/aws.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Allow requests from any origin while keeping cookie auth working
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Lightweight cookie parser to avoid an extra dependency in the dev environment
  app.use((req: any, _res: any, next: any) => {
    req.cookies = {};
    const header = req.headers?.cookie;
    if (header) {
      header.split(';').forEach((pair: string) => {
        const idx = pair.indexOf('=');
        if (idx > -1) {
          const key = pair.slice(0, idx).trim();
          const val = pair.slice(idx + 1).trim();
          try {
            req.cookies[key] = decodeURIComponent(val);
          } catch {
            req.cookies[key] = val;
          }
        }
      });
    }
    next();
  });

  // Enable global validation using class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips out unwanted properties from incoming requests
      forbidNonWhitelisted: true, // Throws an error if unwanted properties are sent
      transform: true, // Automatically transforms payloads to DTO instances
    }),
  );

  // Configure Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('Mini-Jira API')
    .setDescription('The API for the Mini-Jira AWS application')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Start the server
  const port = process.env.PORT ?? 4000;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger documentation available at: http://localhost:${port}/api/docs`);

  // Check AWS Connection on startup
  try {
    const awsService = app.get(AwsService);
    const connectionStatus = await awsService.testConnection();
    if (connectionStatus.tablesFound) {
      logger.log(`Successfully connected to AWS! Found ${connectionStatus.tablesFound.length} DynamoDB tables.`);
    } else {
      logger.warn(`Connected to AWS, but no DynamoDB tables were found or an error occurred: ${connectionStatus.error}`);
    }
  } catch (error) {
    logger.error(`Failed to verify AWS connection on startup: ${error.message}`);
  }
}
bootstrap();
