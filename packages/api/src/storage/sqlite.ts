import type { Document } from "@nullcms/shared";
import type { StorageStrategy } from "./strategy";
import { v4 as uuidv4 } from "uuid";
import path from "node:path";
import fs from "node:fs";
import BetterSQLite3 from "better-sqlite3";
import type { Database } from "better-sqlite3";
import { DocumentQueryArgs } from "../api/graphql";

export interface SQLiteStorageConfig {
  dbPath: string;
  tablePrefix?: string;
}

export class SQLiteStorageStrategy implements StorageStrategy {
  private db!: Database;
  private initialized = false;
  private readonly tablePrefix: string;
  private readonly metaTableName: string;

  constructor(private config: SQLiteStorageConfig) {
    this.tablePrefix = config.tablePrefix || "cms";
    this.metaTableName = `${this.tablePrefix}_collections`;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Ensure the directory exists
    const dbDir = path.dirname(this.config.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Initialize SQLite directly (not dynamically)
    this.db = new BetterSQLite3(this.config.dbPath, {
      verbose: process.env.NODE_ENV === "development" ? console.log : undefined,
    });

    // Enable JSON1 extension and optimize settings
    this.db.pragma("journal_mode = WAL");
    
    // Create the collections metadata table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.metaTableName} (
        name TEXT PRIMARY KEY,
        createdAt TEXT NOT NULL
      )
    `);

    this.initialized = true;
  }

  async cleanup(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.initialized = false;
    }
  }

  private ensureInitialized() {
    if (!this.initialized) {
      throw new Error(
        "Storage strategy not initialized. Call initialize() first."
      );
    }
  }

  private getTableNameForCollection(collectionName: string): string {
    return `${this.tablePrefix}_${collectionName}`;
  }

  private async ensureTableExists(collectionName: string): Promise<void> {
    const tableName = this.getTableNameForCollection(collectionName);
    
    // Create the table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        _id TEXT PRIMARY KEY,
        _createdAt TEXT NOT NULL,
        _updatedAt TEXT NOT NULL,
        data JSON NOT NULL
      )
    `);
    
    // Create index on updatedAt for sorting
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_${tableName}_updated_at 
      ON ${tableName}(_updatedAt)
    `);
  }

  private convertToDbFormat(doc: Record<string, any>): { 
    _id: string, 
    _createdAt: string, 
    _updatedAt: string, 
    data: string 
  } {
    // Extract primary fields
    const { _id, _createdAt, _updatedAt, ...rest } = doc;
    
    // Format dates
    const createdAt = _createdAt instanceof Date ? _createdAt.toISOString() : _createdAt;
    const updatedAt = _updatedAt instanceof Date ? _updatedAt.toISOString() : _updatedAt;
    
    // Convert other dates in the document
    const processedData = this.convertDatesToISOStrings(rest);
    
    return {
      _id,
      _createdAt: createdAt,
      _updatedAt: updatedAt,
      data: JSON.stringify(processedData)
    };
  }

  private convertDatesToISOStrings(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (obj instanceof Date) {
      return obj.toISOString();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.convertDatesToISOStrings(item));
    }
    
    if (typeof obj === 'object') {
      return Object.entries(obj).reduce((acc, [key, value]) => {
        acc[key] = this.convertDatesToISOStrings(value);
        return acc;
      }, {} as Record<string, any>);
    }
    
    return obj;
  }

  private convertFromDbFormat<T extends Document>(row: any): T {
    if (!row) return row;
    
    const { _id, _createdAt, _updatedAt, data } = row;
    const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
    
    return {
      _id,
      _createdAt,
      _updatedAt,
      ...parsedData
    } as T;
  }

  async listCollections(): Promise<string[]> {
    this.ensureInitialized();
    
    const stmt = this.db.prepare(`SELECT name FROM ${this.metaTableName}`);
    const rows = stmt.all();
    return rows.map((row: any) => row.name);
  }

  async createCollection(name: string, initialData: Document[] = []): Promise<void> {
    this.ensureInitialized();
    await this.ensureTableExists(name);
    
    // Register the collection in the meta table if not exists
    const metaInsertStmt = this.db.prepare(`
      INSERT OR IGNORE INTO ${this.metaTableName} (name, createdAt)
      VALUES (?, ?)
    `);
    
    metaInsertStmt.run(name, new Date().toISOString());
    
    // Insert initial data if provided
    if (initialData.length > 0) {
      const tableName = this.getTableNameForCollection(name);
      const insertStmt = this.db.prepare(`
        INSERT INTO ${tableName} (_id, _createdAt, _updatedAt, data)
        VALUES (?, ?, ?, ?)
      `);
      
      const now = new Date().toISOString();
      
      // Use transaction for better performance with multiple inserts
      const transaction = this.db.transaction((docs) => {
        for (const doc of docs) {
          const _id = doc._id || uuidv4();
          const _createdAt = doc._createdAt || now;
          const _updatedAt = doc._updatedAt || now;
          
          const { data } = this.convertToDbFormat({
            ...doc,
            _id,
            _createdAt,
            _updatedAt
          });
          
          insertStmt.run(_id, _createdAt, _updatedAt, data);
        }
      });
      
      transaction(initialData);
    }
  }

  async getCollection<T extends Document>(name: string): Promise<T[]> {
    this.ensureInitialized();
    await this.ensureTableExists(name);
    
    const tableName = this.getTableNameForCollection(name);
    const stmt = this.db.prepare(`
      SELECT _id, _createdAt, _updatedAt, data
      FROM ${tableName}
      ORDER BY _updatedAt DESC
    `);
    
    const rows = stmt.all();
    return rows.map((row) => this.convertFromDbFormat<T>(row));
  }

  async renameCollection(oldName: string, newName: string): Promise<void> {
    this.ensureInitialized();
    
    // Create new collection
    await this.createCollection(newName);
    
    // Copy all data to new collection
    const data = await this.getCollection(oldName);
    
    if (data.length > 0) {
      await this.createCollection(newName, data);
    }
    
    // Remove old collection
    await this.removeCollection(oldName);
  }

  async removeCollection(name: string): Promise<void> {
    this.ensureInitialized();
    const tableName = this.getTableNameForCollection(name);
    
    // Drop the table
    this.db.exec(`DROP TABLE IF EXISTS ${tableName}`);
    
    // Remove from meta table
    const deleteStmt = this.db.prepare(`
      DELETE FROM ${this.metaTableName}
      WHERE name = ?
    `);
    
    deleteStmt.run(name);
  }

  async insert<T extends Document>(
    collection: string,
    document: Omit<T, "_id">
  ): Promise<T> {
    this.ensureInitialized();
    await this.ensureTableExists(collection);
    
    const tableName = this.getTableNameForCollection(collection);
    const now = new Date().toISOString();
    
    // Create a new object with metadata
    const newDocument = {
      ...document,
      _id: (document as any)._id || uuidv4(),
      _createdAt: now,
      _updatedAt: now,
    };
    
    const { _id, _createdAt, _updatedAt, data } = this.convertToDbFormat(newDocument);
    
    const insertStmt = this.db.prepare(`
      INSERT INTO ${tableName} (_id, _createdAt, _updatedAt, data)
      VALUES (?, ?, ?, ?)
    `);
    
    insertStmt.run(_id, _createdAt, _updatedAt, data);
    
    return {
      ...newDocument
    } as T;
  }

  async find<T extends Document>(
    collection: string,
    query: Partial<T> = {},
    options: DocumentQueryArgs = {}
  ): Promise<T[]> {
    this.ensureInitialized();
    await this.ensureTableExists(collection);

    const tableName = this.getTableNameForCollection(collection);
    const { skip = 0, limit } = options;
    const orderBys = Array.isArray(options.orderBy)
      ? options.orderBy
      : options.orderBy
      ? [options.orderBy]
      : [];
    const filters = Array.isArray(options.where)
      ? options.where
      : options.where
      ? [options.where]
      : [];

    // Single-id shortcut
    if (query._id && Object.keys(query).length === 1 && filters.length === 0) {
      const stmt = this.db.prepare(
        `SELECT _id, _createdAt, _updatedAt, data FROM ${tableName} WHERE _id = ?`
      );
      const row = stmt.get(query._id);
      return row ? [this.convertFromDbFormat<T>(row)] : [];
    }

    const params: any[] = [];
    const whereClauses: string[] = [];

    // Simple equality filtering on query object
    const { _id, _createdAt, _updatedAt, ...rest } = query as any;
    if (_id) {
      whereClauses.push("_id = ?");
      params.push(_id);
    }
    if (_createdAt) {
      whereClauses.push("_createdAt = ?");
      params.push(_createdAt instanceof Date ? _createdAt.toISOString() : _createdAt);
    }
    if (_updatedAt) {
      whereClauses.push("_updatedAt = ?");
      params.push(_updatedAt instanceof Date ? _updatedAt.toISOString() : _updatedAt);
    }
    for (const [key, value] of Object.entries(rest)) {
      if (!/^[A-Za-z0-9_]+$/.test(key)) continue;
      const path = `$.${key}`;
      if (value === null) {
        whereClauses.push(`json_extract(data, '${path}') IS NULL`);
      } else {
        whereClauses.push(`json_extract(data, '${path}') = ?`);
        params.push(value instanceof Date ? value.toISOString() : value);
      }
    }

    // GraphQL-style filters
    for (const { field, operator, value } of filters) {
      if (!/^[A-Za-z0-9_]+$/.test(field)) {
        throw new Error(`Invalid filter field '${field}'`);
      }
      const colExpr = ['_id', '_createdAt', '_updatedAt'].includes(field)
        ? field
        : `json_extract(data, '$.${field}')`;
      switch (operator) {
        case 'EQ':
          whereClauses.push(`${colExpr} = ?`);
          params.push(value);
          break;
        case 'NEQ':
          whereClauses.push(`${colExpr} != ?`);
          params.push(value);
          break;
        case 'GT':
          whereClauses.push(`${colExpr} > ?`);
          params.push(value);
          break;
        case 'GTE':
          whereClauses.push(`${colExpr} >= ?`);
          params.push(value);
          break;
        case 'LT':
          whereClauses.push(`${colExpr} < ?`);
          params.push(value);
          break;
        case 'LTE':
          whereClauses.push(`${colExpr} <= ?`);
          params.push(value);
          break;
        case 'IN':
        case 'NIN': {
          if (!Array.isArray(value)) {
            throw new Error(`Value for ${operator} must be an array`);
          }
          const placeholders = value.map(() => '?').join(',');
          whereClauses.push(
            `${colExpr} ${operator === 'IN' ? 'IN' : 'NOT IN'} (${placeholders})`
          );
          params.push(...value);
          break;
        }
        default:
          throw new Error(`Unsupported operator '${operator}'`);
      }
    }

    // Build SQL
    let sql = `SELECT _id, _createdAt, _updatedAt, data FROM ${tableName}`;
    if (whereClauses.length) sql += ` WHERE ${whereClauses.join(' AND ')}`;

    // ORDER BY -- support multiple
    if (orderBys.length) {
      const clauses = orderBys.map(({ field, direction }) => {
        if (!/^[A-Za-z0-9_]+$/.test(field)) {
          throw new Error(`Invalid orderBy field '${field}'`);
        }
        const dir = direction.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        if (['_id', '_createdAt', '_updatedAt'].includes(field)) {
          return `${field} ${dir}`;
        }
          return `json_extract(data, '$.${field}') ${dir}`;
      });
      sql += ` ORDER BY ${clauses.join(', ')}`;
    } else {
      sql += " ORDER BY _updatedAt DESC";
    }

    // LIMIT & OFFSET
    if (limit !== undefined) {
      sql += " LIMIT ?";
      params.push(limit);
    }
    if (skip > 0) {
      sql += " OFFSET ?";
      params.push(skip);
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params);
    return rows.map(row => this.convertFromDbFormat<T>(row));
  }

  async findOne<T extends Document>(
    collection: string,
    query: Partial<T>
  ): Promise<T | null> {
    this.ensureInitialized();
    
    const results = await this.find(collection, query, { limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  async update<T extends Document>(
    collection: string,
    query: Partial<T>,
    document: Omit<T, "_id" | "_createdAt" | "_updatedAt">,
  ): Promise<number> {
    this.ensureInitialized();
    await this.ensureTableExists(collection);
    
    // First find the documents to update
    const docsToUpdate = await this.find(collection, query);
    
    if (docsToUpdate.length === 0) {
      return 0;
    }
    
    const tableName = this.getTableNameForCollection(collection);
    const updateStmt = this.db.prepare(`
      UPDATE ${tableName}
      SET _updatedAt = ?, data = ?
      WHERE _id = ?
    `);
    
    const now = new Date().toISOString();
    let updatedCount = 0;
    
    // Use transaction for performance
    const transaction = this.db.transaction((docs) => {
      for (const doc of docs) {
        // Prepare update data
        const updateData = {
          ...document,
          _id: doc._id, // Ensure ID doesn't change
          _createdAt: doc._createdAt, // Preserve creation time
          _updatedAt: now, // Update modification time
        };
        
        const { data } = this.convertToDbFormat(updateData);
        
        updateStmt.run(now, data, doc._id);
        updatedCount++;
      }
    });
    
    transaction(docsToUpdate);
    return updatedCount;
  }

  async updatePartial<T extends Document>(
    collection: string,
    query: Partial<T>,
    partial: Partial<T>,
  ): Promise<number> {
    this.ensureInitialized();
    await this.ensureTableExists(collection);
    
    // First find the documents to update
    const docsToUpdate = await this.find(collection, query);
    
    if (docsToUpdate.length === 0) {
      return 0;
    }
    
    const tableName = this.getTableNameForCollection(collection);
    const updateStmt = this.db.prepare(`
      UPDATE ${tableName}
      SET _updatedAt = ?, data = ?
      WHERE _id = ?
    `);
    
    const now = new Date().toISOString();
    let updatedCount = 0;
    
    // Use transaction for performance
    const transaction = this.db.transaction((docs) => {
      for (const doc of docs) {
        // Prepare update data
        const updateData = {
          ...doc,  // Start with existing document
          ...partial, // Apply updates
          _id: doc._id, // Ensure ID doesn't change
          _createdAt: doc._createdAt, // Preserve creation time
          _updatedAt: now, // Update modification time
        };
        
        const { data } = this.convertToDbFormat(updateData);
        
        updateStmt.run(now, data, doc._id);
        updatedCount++;
      }
    });
    
    transaction(docsToUpdate);
    return updatedCount;
  }


  async delete<T extends Document>(
    collection: string,
    query: Partial<T>
  ): Promise<number> {
    this.ensureInitialized();
    await this.ensureTableExists(collection);
    
    const tableName = this.getTableNameForCollection(collection);
    
    // If using _id, use direct delete
    if (query._id && Object.keys(query).length === 1) {
      const deleteStmt = this.db.prepare(`
        DELETE FROM ${tableName}
        WHERE _id = ?
      `);
      
      const result = deleteStmt.run(query._id);
      return result.changes;
    }
    
    // Otherwise find all matching documents and delete them
    const docsToDelete = await this.find(collection, query);
    
    if (docsToDelete.length === 0) {
      return 0;
    }
    
    const deleteStmt = this.db.prepare(`
      DELETE FROM ${tableName}
      WHERE _id = ?
    `);
    
    // Use transaction for batched deletes
    const transaction = this.db.transaction((docs) => {
      for (const doc of docs) {
        deleteStmt.run(doc._id);
      }
    });
    
    transaction(docsToDelete);
    return docsToDelete.length;
  }

  async deleteAll<T extends Document>(collection: string): Promise<number> {
    this.ensureInitialized();
    await this.ensureTableExists(collection);
    
    const tableName = this.getTableNameForCollection(collection);
    
    // Count documents first
    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`);
    const { count } = countStmt.get();
    
    // Delete all
    if (count > 0) {
      const deleteStmt = this.db.prepare(`DELETE FROM ${tableName}`);
      deleteStmt.run();
    }
    
    return count;
  }

  async count<T extends Document>(
    collection: string,
    query: Partial<T> = {}
  ): Promise<number> {
    this.ensureInitialized();
    await this.ensureTableExists(collection);
    
    const tableName = this.getTableNameForCollection(collection);
    
    // Simple count without filters
    if (Object.keys(query).length === 0) {
      const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`);
      const { count } = countStmt.get();
      return count;
    }
    
    // For filtered counts, we need to get all matching documents
    // This is inefficient but works for now
    const docs = await this.find(collection, query);
    return docs.length;
  }

  async getSingleton<T extends Document>(name: string): Promise<T | null> {
    this.ensureInitialized();
    
    // Use a special collection for singletons
    const singletonCollection = "singletons";
    await this.ensureTableExists(singletonCollection);
    
    const result = await this.findOne<T>(singletonCollection, { _id: name } as Partial<T>);
    
    if (!result) {
      // Initialize with empty document
      const now = new Date().toISOString();
      const initialDoc = {
        _id: name,
        _createdAt: now,
        _updatedAt: now,
      } as Partial<T>;
      
      await this.insert(singletonCollection, initialDoc as Omit<T, "_id">);
      return await this.findOne<T>(singletonCollection, { _id: name } as Partial<T>);
    }
    
    return result;
  }

  async updateSingleton<T extends Document>(
    name: string,
    data: Partial<T>
  ): Promise<T> {
    this.ensureInitialized();
    
    const singletonCollection = "singletons";
    await this.ensureTableExists(singletonCollection);
    
    const existing = await this.findOne<T>(singletonCollection, { _id: name } as Partial<T>);
    
    if (!existing) {
      // Create if it doesn't exist
      const now = new Date().toISOString();
      const newDoc = {
        _id: name,
        ...data,
        _createdAt: now,
        _updatedAt: now,
      } as Omit<T, "_id"> & { _id?: string };
      
      return await this.insert<T>(singletonCollection, newDoc);
    } else {
      // Update existing
      await this.update<T>(
        singletonCollection,
        { _id: name } as Partial<T>,
        data
      );
      
      const result = await this.findOne<T>(singletonCollection, { _id: name } as Partial<T>);
      if (!result) {
        throw new Error(`Failed to update singleton ${name}`);
      }
      return result;
    }
  }
}