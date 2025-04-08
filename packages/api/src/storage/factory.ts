import { StorageStrategy } from './strategy';
import { LowStorageStrategy, LowStorageConfig } from './lowstorage';
import { StorageType } from '@nullcms/shared';

export interface StorageConfig {
  type: StorageType;
  config: any;
}

export class StorageStrategyFactory {
  static createStrategy(config: StorageConfig): StorageStrategy {
    switch (config.type) {
      case 'lowstorage':
        return new LowStorageStrategy(config.config as LowStorageConfig);
      default:
        throw new Error(`Unsupported storage type: ${config.type}`);
    }
  }
}