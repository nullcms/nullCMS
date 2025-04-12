import type { StorageType } from "@nullcms/shared";
import { type LowStorageConfig, LowStorageStrategy } from "./lowstorage";
import type { StorageStrategy } from "./strategy";
import { type DynamoDBStorageConfig, DynamoDBStorageStrategy } from "./dynamodb";

export interface StorageConfig {
	type: StorageType;
	config: object;
}

export function createStorageStrategy(config: StorageConfig): StorageStrategy {
	switch (config.type) {
		case "lowstorage":
			return new LowStorageStrategy(config.config as LowStorageConfig);
		case "dynamodb":
			return new DynamoDBStorageStrategy(config.config as DynamoDBStorageConfig);
		default:
			throw new Error(`Unsupported storage type: ${config.type}`);
	}
}
