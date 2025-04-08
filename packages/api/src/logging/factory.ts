import { LoggerStrategy, LogLevel } from './strategy';
import { JsonLogger } from './json-logger';
import { TextLogger } from './text-logger';

export type LoggerType = 'json' | 'text';

export interface LoggerConfig {
  type: LoggerType;
  minLevel?: LogLevel;
  colorized?: boolean;
  outputStream?: NodeJS.WriteStream;
}

export class LoggerFactory {
  static createLogger(config: LoggerConfig): LoggerStrategy {
    switch (config.type) {
      case 'json':
        return new JsonLogger({
          minLevel: config.minLevel,
          outputStream: config.outputStream
        });
      case 'text':
        return new TextLogger({
          minLevel: config.minLevel,
          colorized: config.colorized,
          outputStream: config.outputStream
        });
      default:
        throw new Error(`Unsupported logger type: ${config.type}`);
    }
  }
}