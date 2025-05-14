import type { StorageType } from "@nullcms/shared";
import type { StorageStrategy } from "./strategy";
// import { type DynamoDBStorageConfig, DynamoDBStorageStrategy } from "./dynamodb";
import { type SQLiteStorageConfig, SQLiteStorageStrategy } from "./sqlite";

export interface StorageConfig {
	type: StorageType;
	config: object;
}

export function createStorageStrategy(config: StorageConfig): StorageStrategy {
	switch (config.type) {
		case "sqlite":
			return new SQLiteStorageStrategy(config.config as SQLiteStorageConfig);
		// case "dynamodb":
		// 	return new DynamoDBStorageStrategy(config.config as DynamoDBStorageConfig);
		default:
			throw new Error(`Unsupported storage type: ${config.type}`);
	}
}
