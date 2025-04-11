import type { CollectionSchema, Document } from "@nullcms/shared";
import { lowstorage } from "lowstorage";
import { v4 as uuidv4 } from "uuid";
import type { StorageStrategy } from "./strategy";

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
	private storage!: lowstorage;
	private initialized = false;

	constructor(private config: LowStorageConfig) {}

	async initialize(): Promise<void> {
		if (this.initialized) return;

		this.storage = new lowstorage({
			accessKeyId: this.config.accessKeyId,
			secretAccessKey: this.config.secretAccessKey,
			endpoint: this.config.endpoint,
			bucketName: this.config.bucketName,
			region: this.config.region,
			logger: this.config.logger,
			dirPrefix: this.config.dirPrefix || "cms",
			maxRequestSizeInBytes:
				this.config.maxRequestSizeInBytes || 5 * 1024 * 1024,
		});

		this.initialized = true;
	}

	async cleanup(): Promise<void> {
		this.initialized = false;
	}

	private ensureInitialized() {
		if (!this.initialized) {
			throw new Error(
				"Storage strategy not initialized. Call initialize() first.",
			);
		}
	}

	async listCollections(): Promise<string[]> {
		this.ensureInitialized();
		return await this.storage.listCollections();
	}

	async createCollection(
		name: string,
		initialData: Document[] = [],
	): Promise<void> {
		this.ensureInitialized();
		await this.storage.createCollection(name, initialData);
	}

	async getCollection<T extends Document>(name: string): Promise<T[]> {
		this.ensureInitialized();

		const collection = await this.storage.collection(name);

		if (!collection) {
			throw new Error(`Collection ${name} not found`);
		}
		return (await collection.find({})) as T[];
	}

	async renameCollection(oldName: string, newName: string): Promise<void> {
		this.ensureInitialized();

		const collection = await this.storage.collection(oldName);
		if (!collection) {
			throw new Error(`Collection ${oldName} not found`);
		}

		await collection.renameCollection(newName);
	}

	async removeCollection(name: string): Promise<void> {
		this.ensureInitialized();

		const collection = await this.storage.collection(name);
		if (!collection) {
			throw new Error(`Collection ${name} not found`);
		}

		this.storage.removeCollection(name);
	}

	async insert<T extends Document>(
		name: string,
		document: Omit<T, "_id">,
	): Promise<T> {
		this.ensureInitialized();

		const collection = await this.storage.collection(name);
		if (!collection) {
			throw new Error(`Collection ${name} not found`);
		}

		const now = new Date();
		const docWithMeta = {
			...document,
			_id: document._id ?? uuidv4(),
			_createdAt: now,
			_updatedAt: now,
		} as T;

		await collection.insert(docWithMeta);
		return docWithMeta;
	}

	async find<T extends Document>(
		name: string,
		query: Partial<T> = {},
		options: { skip?: number; limit?: number } = {},
	): Promise<T[]> {
		this.ensureInitialized();

		const collection = await this.storage.collection(name);
		if (!collection) {
			throw new Error(`Collection ${name} not found`);
		}

		return (await collection.find(query, options)) as T[];
	}

	async findOne<T extends Document>(
		name: string,
		query: Partial<T>,
	): Promise<T | null> {
		this.ensureInitialized();

		const collection = await this.storage.collection(name);
		if (!collection) {
			throw new Error(`Collection ${name} not found`);
		}

		return (await collection.findOne(query)) as T;
	}

	async update<T extends Document>(
		name: string,
		query: Partial<T>,
		update: Partial<T>,
	): Promise<number> {
		this.ensureInitialized();

		const collection = await this.storage.collection(name);
		if (!collection) {
			throw new Error(`Collection ${name} not found`);
		}

		// Find the document first to get its ID
		const existingDoc = (await collection.findOne(query)) as T;
		console.log(collection);

		existingDoc._updatedAt = new Date();

		update._id = existingDoc._id;
		update._createdAt = existingDoc._createdAt;
		update._updatedAt = new Date();

		if (existingDoc) {
			// Delete the existing document
			await collection.delete({ _id: existingDoc._id });

			// Insert the replacement
			await collection.insert(update);
			return 1;
		}
		return 0;
	}

	async delete<T extends Document>(
		name: string,
		query: Partial<T>,
	): Promise<number> {
		this.ensureInitialized();

		const collection = await this.storage.collection(name);
		if (!collection) {
			throw new Error(`Collection ${name} not found`);
		}

		await collection.delete(query);
		return 1; // lowstorage doesn't seem to return count of deleted documents
	}

	async deleteAll<T extends Document>(name: string): Promise<number> {
		this.ensureInitialized();

		const collection = await this.storage.collection(name);
		if (!collection) {
			throw new Error(`Collection ${name} not found`);
		}

		await collection.deleteAll();
		return await collection.count();
	}

	async count<T extends Document>(
		name: string,
		query: Partial<T> = {},
	): Promise<number> {
		this.ensureInitialized();

		const collection = await this.storage.collection(name);
		if (!collection) {
			throw new Error(`Collection ${name} not found`);
		}

		return await collection.count(query);
	}

	async getSingleton<T extends Document>(name: string): Promise<T | null> {
		this.ensureInitialized();

		const singletons = await this.storage.collection("singletons");
		if (!singletons) {
			this.storage.createCollection("singletons");
		}

		const data = await singletons.findOne({ _id: name });
		if (!data) {
			// Initialize with empty document if it doesn't exist
			await singletons.insert({
				_id: name,
				_createdAt: new Date(),
				_updatedAt: new Date(),
			});
			return (await singletons.findOne({ _id: name })) as T;
		}
		return data as T;
	}

	async updateSingleton<T extends Document>(
		name: string,
		data: Partial<T>,
	): Promise<T> {
		this.ensureInitialized();

		const singletons = await this.storage.collection("singletons");
		if (!singletons) {
			this.storage.createCollection("singletons");
		}

		// Update existing singleton
		const updateData = {
			...data,
			_updatedAt: new Date(),
		};

		const singleton = await singletons.findOne({ _id: name });
		if (!singleton) {
			// Initialize with empty document if it doesn't exist
			await singletons.insert({ _createdAt: new Date(), ...updateData });
			return (await singletons.findOne({ _id: name })) as T;
		}

		await singletons.update({ _id: name }, updateData);
		return (await singletons.findOne({ _id: name })) as T;
	}
}
