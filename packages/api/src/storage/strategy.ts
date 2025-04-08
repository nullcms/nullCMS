import { Document } from '@nullcms/shared';

export interface StorageStrategy {
    // Collection operations
    listCollections(): Promise<string[]>;
    createCollection(name: string, initialData?: Document[]): Promise<void>;
    getCollection<T extends Document>(name: string): Promise<T[]>;
    renameCollection(oldName: string, newName: string): Promise<void>;
    removeCollection(name: string): Promise<void>;

    // Document operations
    insert<T extends Document>(collection: string, document: Omit<T, '_id'>): Promise<T>;
    find<T extends Document>(collection: string, query: Partial<T>, options?: { skip?: number, limit?: number }): Promise<T[]>;
    findOne<T extends Document>(collection: string, query: Partial<T>): Promise<T | null>;
    update<T extends Document>(collection: string, query: Partial<T>, update: Partial<T>): Promise<number>;
    delete<T extends Document>(collection: string, query: Partial<T>): Promise<number>;
    deleteAll<T extends Document>(collection: string): Promise<number>;
    count<T extends Document>(collection: string, query?: Partial<T>): Promise<number>;

    // Singleton operations
    getSingleton<T extends Document>(name: string): Promise<T | null>;
    updateSingleton<T extends Document>(name: string, data: Partial<T>): Promise<T>;

    // Initialize and cleanup
    initialize(): Promise<void>;
    cleanup(): Promise<void>;
}