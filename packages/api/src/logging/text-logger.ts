import { type LogEntry, LogLevel, type LoggerStrategy } from "./strategy";

export class TextLogger implements LoggerStrategy {
	constructor(
		private options: {
			outputStream?: NodeJS.WriteStream;
			minLevel?: LogLevel;
			colorized?: boolean;
		} = {},
	) {
		this.options.outputStream = options.outputStream || process.stdout;
		this.options.minLevel = options.minLevel || LogLevel.DEBUG;
		this.options.colorized = options.colorized ?? true;
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

	private getLevelColor(level: LogLevel): string {
		if (!this.options.colorized) return "";

		switch (level) {
			case LogLevel.DEBUG:
				return "\x1b[34m"; // Blue
			case LogLevel.INFO:
				return "\x1b[32m"; // Green
			case LogLevel.WARN:
				return "\x1b[33m"; // Yellow
			case LogLevel.ERROR:
				return "\x1b[31m"; // Red
			default:
				return "";
		}
	}

	private resetColor(): string {
		return this.options.colorized ? "\x1b[0m" : "";
	}

	log(entry: LogEntry): void {
		if (!this.shouldLog(entry.level)) return;

		const color = this.getLevelColor(entry.level);
		const reset = this.resetColor();
		const timestamp = entry.timestamp.toISOString();
		const level = entry.level.toUpperCase().padEnd(5);

		let message = `${timestamp} ${color}${level}${reset} ${entry.message}`;

		if (entry.context && Object.keys(entry.context).length > 0) {
			message += `\n${JSON.stringify(entry.context, null, 2)}`;
		}

		if (this.options.outputStream) {
			this.options.outputStream.write(`${message}\n`);
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
