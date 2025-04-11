import { type LogEntry, LogLevel, type LoggerStrategy } from "./strategy";

export class JsonLogger implements LoggerStrategy {
	constructor(
		private options: {
			outputStream?: NodeJS.WriteStream;
			minLevel?: LogLevel;
		} = {},
	) {
		this.options.outputStream = options.outputStream || process.stdout;
		this.options.minLevel = options.minLevel || LogLevel.DEBUG;
	}

	private shouldLog(level: LogLevel): boolean {
		const levels = [
			LogLevel.DEBUG,
			LogLevel.INFO,
			LogLevel.WARN,
			LogLevel.ERROR,
		];
		const minLevelIndex = this.options.minLevel
			? levels.indexOf(this.options.minLevel)
			: 0;
		const currentLevelIndex = levels.indexOf(level);

		return currentLevelIndex >= minLevelIndex;
	}

	log(entry: LogEntry): void {
		if (!this.shouldLog(entry.level)) return;

		const logObject = {
			level: entry.level,
			message: entry.message,
			timestamp: entry.timestamp.toISOString(),
			...(entry.context || {}),
		};

		if (this.options.outputStream) {
			this.options.outputStream.write(`${JSON.stringify(logObject)}\n`);
		}
	}

	debug(message: string, context?: Record<string, object>): void {
		this.log({
			level: LogLevel.DEBUG,
			message,
			timestamp: new Date(),
			context,
		});
	}

	info(message: string, context?: Record<string, object>): void {
		this.log({
			level: LogLevel.INFO,
			message,
			timestamp: new Date(),
			context,
		});
	}

	warn(message: string, context?: Record<string, object>): void {
		this.log({
			level: LogLevel.WARN,
			message,
			timestamp: new Date(),
			context,
		});
	}

	error(message: string, context?: Record<string, object>): void {
		this.log({
			level: LogLevel.ERROR,
			message,
			timestamp: new Date(),
			context,
		});
	}
}
