import {lowstorage} from 'lowstorage';
import {StorageStrategy} from './strategy';
import {Document} from '@nullcms/shared';
import {v4 as uuidv4} from 'uuid';

export interface LowStorageConfig {
    accessKeyId: string;
    secretAccessKey: string;
    endpoint: string;
    bucketName: string;
    region?: string;
    logger?: Console;
    dirPrefix?: string;
    maxRequestSizeInBytes?: number;
}

export class LowStorageStrategy implements StorageStrategy {
    private storage: any;
    private collections: Map<string, any> = new Map();
    private singletons: Map<string, any> = new Map();
    private initialized: boolean = false;

    constructor(private config: LowStorageConfig) { }

    async initialize(): Promise<void> {
        if (this.initialized) return;

        this.storage = new lowstorage({
            accessKeyId: this.config.accessKeyId,
            secretAccessKey: this.config.secretAccessKey,
            endpoint: this.config.endpoint,
            bucketName: this.config.bucketName,
            region: this.config.region,
            logger: this.config.logger,
            dirPrefix: this.config.dirPrefix || 'cms',
            maxRequestSizeInBytes: this.config.maxRequestSizeInBytes || 5 * 1024 * 1024,
        });

        this.initialized = true;
    }

    async cleanup(): Promise<void> {
        this.collections.clear();
        this.singletons.clear();
        this.initialized = false;
    }

    private ensureInitialized() {
        if (!this.initialized) {
            throw new Error('Storage strategy not initialized. Call initialize() first.');
        }
    }

    async listCollections(): Promise<string[]> {
        this.ensureInitialized();
        return await this.storage.listCollections();
    }

    async createCollection(name: string, initialData: Document[] = []): Promise<void> {
        this.ensureInitialized();
        await this.storage.createCollection(name, initialData);
        this.collections.delete(name); // Clear cache if exists
    }

    async getCollection<T extends Document>(name: string): Promise<T[]> {
        this.ensureInitialized();

        if (!this.collections.has(name)) {
            const collection = await this.storage.collection(name);
            this.collections.set(name, collection);
        }

        return await this.collections.get(name).find({});
    }

    async renameCollection(oldName: string, newName: string): Promise<void> {
        this.ensureInitialized();

        if (!this.collections.has(oldName)) {
            const collection = await this.storage.collection(oldName);
            this.collections.set(oldName, collection);
        }

        await this.collections.get(oldName).renameCollection(newName);
        this.collections.delete(oldName);
    }

    async removeCollection(name: string): Promise<void> {
        this.ensureInitialized();

        if (!this.collections.has(name)) {
            const collection = await this.storage.collection(name);
            this.collections.set(name, collection);
        }

        await this.collections.get(name).removeCollection();
        this.collections.delete(name);
    }

    async insert<T extends Document>(collection: string, document: Omit<T, '_id'>): Promise<T> {
        this.ensureInitialized();

        if (!this.collections.has(collection)) {
            const col = await this.storage.collection(collection);
            this.collections.set(collection, col);
        }

        const now = new Date();
        const docWithMeta = {
            ...document,
            _id: document._id ?? uuidv4(),
            _createdAt: now,
            _updatedAt: now
        } as T;

        await this.collections.get(collection).insert(docWithMeta);
        return docWithMeta;
    }

    async find<T extends Document>(
        collection: string,
        query: Partial<T> = {},
        options: { skip?: number, limit?: number } = {}
    ): Promise<T[]> {
        this.ensureInitialized();

        if (!this.collections.has(collection)) {
            const col = await this.storage.collection(collection);
            this.collections.set(collection, col);
        }

        return await this.collections.get(collection).find(query, options);
    }

    async findOne<T extends Document>(collection: string, query: Partial<T>): Promise<T | null> {
        this.ensureInitialized();

        if (!this.collections.has(collection)) {
            const col = await this.storage.collection(collection);
            this.collections.set(collection, col);
        }

        return await this.collections.get(collection).findOne(query);
    }

    async update<T extends Document>(
        collection: string,
        query: Partial<T>,
        update: Partial<T>
    ): Promise<number> {
        this.ensureInitialized();

        if (!this.collections.has(collection)) {
            const col = await this.storage.collection(collection);
            this.collections.set(collection, col);
        }

        // Find the document first to get its ID
        const existingDoc = await this.collections.get(collection).findOne(query);
        console.log("AAA")
        console.log(collection)

        existingDoc._updatedAt = new Date();

        update._id = existingDoc._id;
        update._createdAt = existingDoc._createdAt;
        update._updatedAt = new Date();

        if (existingDoc) {
            // Delete the existing document
            await this.collections.get(collection).delete({ _id: existingDoc._id });

            // Insert the replacement
            await this.collections.get(collection).insert(update)
            return 1;
        }
        return 0;
    }

    async delete<T extends Document>(collection: string, query: Partial<T>): Promise<number> {
        this.ensureInitialized();

        if (!this.collections.has(collection)) {
            const col = await this.storage.collection(collection);
            this.collections.set(collection, col);
        }

        await this.collections.get(collection).delete(query);
        return 1; // lowstorage doesn't seem to return count of deleted documents
    }

    async deleteAll<T extends Document>(collection: string): Promise<number> {
        this.ensureInitialized();

        if (!this.collections.has(collection)) {
            const col = await this.storage.collection(collection);
            this.collections.set(collection, col);
        }

        await this.collections.get(collection).deleteAll();
        return await this.collections.get(collection).count();
    }

    async count<T extends Document>(collection: string, query: Partial<T> = {}): Promise<number> {
        this.ensureInitialized();

        if (!this.collections.has(collection)) {
            const col = await this.storage.collection(collection);
            this.collections.set(collection, col);
        }

        return await this.collections.get(collection).count(query);
    }

    async getSingleton<T extends Document>(name: string): Promise<T | null> {
        this.ensureInitialized();

        // For singletons, we use a collection with a single document
        if (!this.singletons.has(name)) {
            const singleton = await this.storage.collection(`singleton_${name}`);
            this.singletons.set(name, singleton);

            // Try to get the singleton document
            const data = await singleton.findOne({ _id: name });
            if (!data) {
                // Initialize with empty document if it doesn't exist
                await singleton.insert({ _id: name, _createdAt: new Date(), _updatedAt: new Date() });
                return await singleton.findOne({ _id: name });
            }
            return data;
        }

        return await this.singletons.get(name).findOne({ _id: name });
    }

    async updateSingleton<T extends Document>(name: string, data: Partial<T>): Promise<T> {
        this.ensureInitialized();

        if (!this.singletons.has(name)) {
            const singleton = await this.storage.collection(`singleton_${name}`);
            this.singletons.set(name, singleton);

            // Check if singleton exists
            const existing = await singleton.findOne({ _id: name });
            if (!existing) {
                // Create if it doesn't exist
                const now = new Date();
                const newData = {
                    _id: name,
                    ...data,
                    _createdAt: now,
                    _updatedAt: now
                };
                await singleton.insert(newData);
                return newData as T;
            }
        }

        // Update existing singleton
        const updateData = {
            ...data,
            _updatedAt: new Date()
        };

        await this.singletons.get(name).update({ _id: name }, updateData);
        return await this.singletons.get(name).findOne({ _id: name });
    }
}