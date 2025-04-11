export enum LogLevel {
	DEBUG = "debug",
	INFO = "info",
	WARN = "warn",
	ERROR = "error",
}

export interface LogEntry {
	level: LogLevel;
	message: string;
	timestamp: Date;
	context?: Record<string, object>;
}

export interface LoggerStrategy {
	log(entry: LogEntry): void;
	debug(message: string, context?: Record<string, object>): void;
	info(message: string, context?: Record<string, object>): void;
	warn(message: string, context?: Record<string, object>): void;
	error(message: string, context?: Record<string, object>): void;
}
