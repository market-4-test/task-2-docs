import { Config } from '@/config/config.ts';
import { Server } from '@/server/server.ts';
import { loggerFactory } from "@/factories/logger.factory.ts";
import { EventService } from "@/services/event.service.ts";

/**
 * The main entry point for the application.
 * It initializes the configuration and logger, then creates and starts the server.
 */
function bootstrap() {
  const config = new Config();
  const logger = loggerFactory(config);
  const eventService = new EventService(logger);
  
  logger.info('Application starting up...');
  
  const server = new Server({
    config,
    logger,
    eventService
  });
  
  server.start();
}

bootstrap();