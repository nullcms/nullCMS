import type {
	CMSSchema,
	CollectionSchema,
	Document,
	SingletonSchema,
} from "@nullcms/shared";
import { type StorageConfig, createStorageStrategy } from "../storage/factory";
import type { StorageStrategy } from "../storage/strategy";
import { Auth } from "./auth";

export class CMS {
	private storage: StorageStrategy;
	private schema: CMSSchema;
	public auth: Auth;
	private isInitialized = false;

	constructor(storageConfig: StorageConfig, schema: CMSSchema) {
		this.storage = createStorageStrategy(storageConfig);
		this.schema = schema;
		this.auth = new Auth(this.storage);
	}

	async initialize(): Promise<void> {
		if (this.isInitialized) return;
		await this.storage.initialize();
		await this.initializeCollections();
		await this.initializeSingletons();
		await this.auth.initialize();

		this.isInitialized = true;
	}

	private async initializeCollections(): Promise<void> {
		if (!this.schema.collections) return;

		const existingCollections = await this.storage.listCollections();

		for (const [name, schema] of Object.entries(this.schema.collections)) {
			if (!existingCollections.includes(name)) {
				await this.storage.createCollection(name);
			}
		}
	}

	private async initializeSingletons(): Promise<void> {
		if (!this.schema.singletons) return;

		for (const [name, schema] of Object.entries(this.schema.singletons)) {
			// Just ensure the singleton exists
			await this.storage.getSingleton(name);
		}
	}

	async shutdown(): Promise<void> {
		await this.storage.cleanup();
		this.isInitialized = false;
	}

	private ensureInitialized(): void {
		if (!this.isInitialized) {
			throw new Error("CMS not initialized. Call initialize() first.");
		}
	}

	// Collection methods
	async getCollections(): Promise<string[]> {
		this.ensureInitialized();
		return Object.keys(this.schema.collections || {});
	}

	async getCollectionSchema(name: string): Promise<CollectionSchema | null> {
		this.ensureInitialized();
		return this.schema.collections?.[name] || null;
	}

	async getCollectionDocuments<T extends Document>(
		name: string,
		options: { skip?: number; limit?: number } = {},
	): Promise<T[]> {
		this.ensureInitialized();

		if (!this.schema.collections?.[name]) {
			throw new Error(`Collection '${name}' not found in schema`);
		}

		return await this.storage.find<T>(name, {}, options);
	}

	async getDocument<T extends Document>(
		collection: string,
		id: string,
	): Promise<T | null> {
		this.ensureInitialized();

		if (!this.schema.collections?.[collection]) {
			throw new Error(`Collection '${collection}' not found in schema`);
		}

		return await this.storage.findOne<T>(collection, { _id: id } as Partial<T>);
	}

	async createDocument<T extends Document>(
		collection: string,
		data: Omit<T, "_id">,
	): Promise<T> {
		this.ensureInitialized();

		if (!this.schema.collections?.[collection]) {
			throw new Error(`Collection '${collection}' not found in schema`);
		}

		// TODO: Validate data against schema

		return await this.storage.insert<T>(collection, data);
	}

	async updateDocument<T extends Document>(
		collection: string,
		id: string,
		data: Partial<Omit<T, "_id" | "_createdAt" | "_updatedAt">>,
	): Promise<T | null> {
		this.ensureInitialized();

		if (!this.schema.collections?.[collection]) {
			throw new Error(`Collection '${collection}' not found in schema`);
		}

		// TODO: Validate data against schema

		console.log(data);

		await this.storage.update<T>(
			collection,
			{ _id: id } as Partial<T>,
			data as Partial<T>,
		);
		return await this.storage.findOne<T>(collection, { _id: id } as Partial<T>);
	}

	async deleteDocument<T extends Document>(
		collection: string,
		id: string,
	): Promise<boolean> {
		this.ensureInitialized();

		if (!this.schema.collections?.[collection]) {
			throw new Error(`Collection '${collection}' not found in schema`);
		}

		const count = await this.storage.delete<T>(collection, {
			_id: id,
		} as Partial<T>);
		return count > 0;
	}

	// Singleton methods
	async getSingletons(): Promise<string[]> {
		this.ensureInitialized();
		return Object.keys(this.schema.singletons || {});
	}

	async getSingletonSchema(name: string): Promise<SingletonSchema | null> {
		this.ensureInitialized();
		return this.schema.singletons?.[name] || null;
	}

	async getSingleton<T extends Document>(name: string): Promise<T | null> {
		this.ensureInitialized();

		if (!this.schema.singletons?.[name]) {
			throw new Error(`Singleton '${name}' not found in schema`);
		}

		return await this.storage.getSingleton<T>(name);
	}

	async updateSingleton<T extends Document>(
		name: string,
		data: Partial<Omit<T, "_id" | "_createdAt" | "_updatedAt">>,
	): Promise<T> {
		this.ensureInitialized();

		if (!this.schema.singletons?.[name]) {
			throw new Error(`Singleton '${name}' not found in schema`);
		}

		// TODO: Validate data against schema

		return await this.storage.updateSingleton<T>(name, data as Partial<T>);
	}

	getSchema(): CMSSchema {
		return this.schema;
	}
}
