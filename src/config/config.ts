export interface IConfig {
  readonly port: number;
  readonly hostname: string;
  readonly logLevel: string;
}

/**
 * The Config class encapsulates the application's configuration.
 * It reads environment variables from the .env file using Bun.env.
 */
export class Config implements IConfig {
  public readonly port: number;
  public readonly hostname: string;
  public readonly logLevel: string;
  
  constructor() {
    this.port = Number(Bun.env.PORT) || 3000;
    this.hostname = Bun.env.HOSTNAME || '0.0.0.0';
    this.logLevel = Bun.env.LOG_LEVEL || 'info';
  }
}