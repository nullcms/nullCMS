import type { StorageType } from "@nullcms/shared";
import { type LowStorageConfig, LowStorageStrategy } from "./lowstorage";
import type { StorageStrategy } from "./strategy";

export interface StorageConfig {
	type: StorageType;
	config: object;
}

export function createStorageStrategy(config: StorageConfig): StorageStrategy {
	switch (config.type) {
		case "lowstorage":
			return new LowStorageStrategy(config.config as LowStorageConfig);
		default:
			throw new Error(`Unsupported storage type: ${config.type}`);
	}
}
