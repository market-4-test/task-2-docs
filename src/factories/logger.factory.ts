import pino, { type Logger } from 'pino';
import { type IConfig } from "@/config/config.ts";

/**
 * Creates and configures a pino logger instance.
 * In development, it uses 'pino-pretty' for human-readable output.
 * In production, it logs in JSON format for better machine processing.
 *
 * @param {IConfig} config - The application configuration.
 * @returns {Logger} A configured pino logger instance.
 */
export function loggerFactory(config: IConfig): Logger {
  const loggerOptions: pino.LoggerOptions = {
    level: config.logLevel,
  };
  
  // Use pino-pretty for development for more readable logs
  if (process.env.NODE_ENV !== 'production') {
    loggerOptions.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    };
  }
  
  return pino(loggerOptions);
}