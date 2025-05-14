// import type { Document } from "@nullcms/shared";
// import { 
//   DynamoDB, 
//   DynamoDBClient, 
//   DescribeTableCommand,
//   CreateTableCommand,
//   DeleteTableCommand
// } from "@aws-sdk/client-dynamodb";
// import { 
//   DynamoDBDocument, 
//   PutCommand, 
//   GetCommand, 
//   ScanCommand,
//   type ScanCommandInput,
//   DeleteCommand,
//   BatchWriteCommand,
//   type BatchWriteCommandInput
// } from "@aws-sdk/lib-dynamodb";
// import { v4 as uuidv4 } from "uuid";
// import type { StorageStrategy } from "./strategy";

// export interface DynamoDBStorageConfig {
//   region: string;
//   endpoint?: string;
//   accessKeyId?: string;
//   secretAccessKey?: string;
//   tablePrefix?: string;
//   maxBatchSize?: number;
// }

// type DynamoDBCredentials = {
//   accessKeyId: string;
//   secretAccessKey: string;
// };

// type DynamoDBClientConfig = {
//   region: string;
//   endpoint?: string;
//   credentials?: DynamoDBCredentials;
// };

// export class DynamoDBStorageStrategy implements StorageStrategy {
//   private client!: DynamoDBClient;
//   private docClient!: DynamoDBDocument;
//   private initialized = false;
//   private readonly tablePrefix: string;
//   private readonly maxBatchSize: number;
//   private readonly metaTableName: string;

//   constructor(private config: DynamoDBStorageConfig) {
//     this.tablePrefix = config.tablePrefix || "cms";
//     this.maxBatchSize = config.maxBatchSize || 25; // DynamoDB BatchWrite limit
//     this.metaTableName = `${this.tablePrefix}_collections`;
//   }

//   async initialize(): Promise<void> {
//     if (this.initialized) return;

//     const clientConfig: DynamoDBClientConfig = {
//       region: this.config.region,
//     };

//     if (this.config.endpoint) {
//       clientConfig.endpoint = this.config.endpoint;
//     }

//     if (this.config.accessKeyId && this.config.secretAccessKey) {
//       clientConfig.credentials = {
//         accessKeyId: this.config.accessKeyId,
//         secretAccessKey: this.config.secretAccessKey,
//       };
//     }

//     this.client = new DynamoDBClient(clientConfig);
//     this.docClient = DynamoDBDocument.from(new DynamoDB(clientConfig));

//     // Create the collections metadata table if it doesn't exist
//     await this.ensureMetaTableExists();

//     this.initialized = true;
//   }

//   async cleanup(): Promise<void> {
//     await this.client.destroy();
//     this.initialized = false;
//   }

//   private ensureInitialized() {
//     if (!this.initialized) {
//       throw new Error(
//         "Storage strategy not initialized. Call initialize() first."
//       );
//     }
//   }

//   private getTableNameForCollection(collectionName: string): string {
//     return `${this.tablePrefix}_${collectionName}`;
//   }

//   private async ensureMetaTableExists(): Promise<void> {
//     try {
//       await this.client.send(
//         new DescribeTableCommand({
//           TableName: this.metaTableName,
//         })
//       );
//     } catch (error) {
//       // Table doesn't exist, create it
//       await this.client.send(
//         new CreateTableCommand({
//           TableName: this.metaTableName,
//           KeySchema: [
//             { AttributeName: "name", KeyType: "HASH" },
//           ],
//           AttributeDefinitions: [
//             { AttributeName: "name", AttributeType: "S" },
//           ],
//           BillingMode: "PAY_PER_REQUEST"
//         })
//       );
//     }
//   }

//   private async ensureTableExists(collectionName: string): Promise<void> {
//     const tableName = this.getTableNameForCollection(collectionName);
//     const maxRetries = 3;
//     let retryCount = 0;

//     while (retryCount < maxRetries) {
//       try {
//         // Try to describe the table to see if it exists
//         await this.client.send(
//           new DescribeTableCommand({
//             TableName: tableName,
//           })
//         );
//         // Table exists, no need to create
//         return;
//       } catch (error) {
//         if ((error as any).name === 'ResourceNotFoundException') {
//           try {
//             // Table doesn't exist, create it
//             await this.client.send(
//               new CreateTableCommand({
//                 TableName: tableName,
//                 KeySchema: [
//                   { AttributeName: "_id", KeyType: "HASH" },
//                 ],
//                 AttributeDefinitions: [
//                   { AttributeName: "_id", AttributeType: "S" },
//                   { AttributeName: "_updatedAt", AttributeType: "S" },
//                 ],
//                 GlobalSecondaryIndexes: [
//                   {
//                     IndexName: "UpdatedAtIndex",
//                     KeySchema: [
//                       { AttributeName: "_updatedAt", KeyType: "HASH" },
//                     ],
//                     Projection: {
//                       ProjectionType: "ALL",
//                     }
//                   },
//                 ],
//                 BillingMode: "PAY_PER_REQUEST",
//               })
//             );

//             // Wait for table to be active
//             await this.waitForTableActive(tableName);

//             // Register the collection in the meta table
//             await this.docClient.send(
//               new PutCommand({
//                 TableName: this.metaTableName,
//                 Item: {
//                   name: collectionName,
//                   createdAt: new Date().toISOString(),
//                 },
//               })
//             );
            
//             return;
//           } catch (createError) {
//             console.error(`Error creating table ${tableName}:`, createError);
//             if ((createError as any).name === 'ResourceInUseException') {
//               // Table is being created by another process, wait a bit and retry describe
//               await new Promise(resolve => setTimeout(resolve, 2000));
//             } else {
//               throw createError;
//             }
//           }
//         } else if ((error as any).name === 'NetworkingError' || 
//                   (error as Error).message.includes('Network connection')) {
//           // Handle network errors with retries
//           retryCount++;
//           const delay = 2 ** retryCount * 500; // Exponential backoff
//           console.warn(`Network error, retrying in ${delay}ms (${retryCount}/${maxRetries})`);
//           await new Promise(resolve => setTimeout(resolve, delay));
//         } else {
//           throw error;
//         }
//       }
//     }
    
//     throw new Error(`Failed to ensure table exists after ${maxRetries} retries`);
//   }

//   // Helper to wait for table to become active
//   private async waitForTableActive(tableName: string, maxRetries = 10): Promise<void> {
//     for (let i = 0; i < maxRetries; i++) {
//       try {
//         const { Table } = await this.client.send(
//           new DescribeTableCommand({
//             TableName: tableName,
//           })
//         );
        
//         if (Table?.TableStatus === 'ACTIVE') {
//           return;
//         }
        
//         // Wait before checking again
//         await new Promise(resolve => setTimeout(resolve, 1000));
//       } catch (error) {
//         if (i === maxRetries - 1) {
//           throw error;
//         }
        
//         // Wait longer on error
//         await new Promise(resolve => setTimeout(resolve, 2000));
//       }
//     }
    
//     throw new Error(`Table ${tableName} did not become active in time`);
//   }

//   private convertToDbFormat(obj: Record<string, any>): Record<string, any> {
//     return Object.entries(obj).reduce((acc, [key, value]) => {
//       if (value instanceof Date) {
//         // Convert Date objects to ISO strings
//         acc[key] = value.toISOString();
//       } else if (value === undefined) {
//         // Skip undefined values (DynamoDB doesn't accept them)
//       } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
//         // Recursively process nested objects
//         acc[key] = this.convertToDbFormat(value);
//       } else if (Array.isArray(value)) {
//         // Handle arrays
//         acc[key] = value.map(item => 
//           item instanceof Date ? item.toISOString() :
//           (item !== null && typeof item === 'object') ? this.convertToDbFormat(item) : item
//         );
//       } else {
//         acc[key] = value;
//       }
//       return acc;
//     }, {} as Record<string, any>);
//   }

//   async listCollections(): Promise<string[]> {
//     this.ensureInitialized();

//     const { Items } = await this.docClient.send(
//       new ScanCommand({
//         TableName: this.metaTableName,
//       })
//     );

//     return Items ? Items.map((item) => item.name as string) : [];
//   }

//   async createCollection(name: string, initialData: Document[] = []): Promise<void> {
//     this.ensureInitialized();
//     await this.ensureTableExists(name);

//     if (initialData.length > 0) {
//       // Insert initial data in batches
//       const tableName = this.getTableNameForCollection(name);
//       const batches = [];

//       // Split into batches of maxBatchSize
//       for (let i = 0; i < initialData.length; i += this.maxBatchSize) {
//         const batch = initialData.slice(i, i + this.maxBatchSize);
        
//         const now = new Date();
//         const batchItems = batch.map(doc => ({
//           PutRequest: {
//             Item: this.convertToDbFormat({
//               ...doc,
//               _id: doc._id || uuidv4(),
//               _createdAt: doc._createdAt || now,
//               _updatedAt: doc._updatedAt || now,
//             })
//           }
//         }));

//         batches.push(batchItems);
//       }

//       // Execute each batch
//       for (const batchItems of batches) {
//         const batchParams: BatchWriteCommandInput = {
//           RequestItems: {
//             [tableName]: batchItems
//           }
//         };
        
//         await this.docClient.send(new BatchWriteCommand(batchParams));
//       }
//     }
//   }

//   async getCollection<T extends Document>(name: string): Promise<T[]> {
//     this.ensureInitialized();
//     await this.ensureTableExists(name);

//     const tableName = this.getTableNameForCollection(name);
    
//     // Use scan to get all items, but with pagination
//     const allItems: T[] = [];
//     let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;
    
//     do {
//       const params: ScanCommandInput = {
//         TableName: tableName,
//       };
      
//       if (lastEvaluatedKey) {
//         params.ExclusiveStartKey = lastEvaluatedKey;
//       }
      
//       const response = await this.docClient.send(new ScanCommand(params));
      
//       if (response.Items) {
//         allItems.push(...(response.Items as T[]));
//       }
      
//       lastEvaluatedKey = response.LastEvaluatedKey;
//     } while (lastEvaluatedKey);

//     return allItems;
//   }

//   async renameCollection(oldName: string, newName: string): Promise<void> {
//     this.ensureInitialized();
    
//     // Create new collection
//     await this.createCollection(newName);
    
//     // Copy all data to new collection
//     const data = await this.getCollection(oldName);
//     const newTableName = this.getTableNameForCollection(newName);
    
//     if (data.length > 0) {
//       // Insert data in batches
//       const batches = [];
      
//       for (let i = 0; i < data.length; i += this.maxBatchSize) {
//         const batch = data.slice(i, i + this.maxBatchSize);
        
//         const batchItems = batch.map(doc => ({
//           PutRequest: {
//             Item: this.convertToDbFormat(doc)
//           }
//         }));
        
//         batches.push(batchItems);
//       }
      
//       for (const batchItems of batches) {
//         const batchParams: BatchWriteCommandInput = {
//           RequestItems: {
//             [newTableName]: batchItems
//           }
//         };
        
//         await this.docClient.send(new BatchWriteCommand(batchParams));
//       }
//     }
    
//     // Remove old collection
//     await this.removeCollection(oldName);
//   }

//   async removeCollection(name: string): Promise<void> {
//     this.ensureInitialized();
//     const tableName = this.getTableNameForCollection(name);
    
//     try {
//       // Delete the table
//       await this.client.send(
//         new DeleteTableCommand({
//           TableName: tableName,
//         })
//       );
      
//       // Delete from meta table
//       await this.docClient.send(
//         new DeleteCommand({
//           TableName: this.metaTableName,
//           Key: {
//             name: name,
//           },
//         })
//       );
//     } catch (error) {
//       console.error(`Error removing collection ${name}:`, error);
//       throw error;
//     }
//   }

//   async insert<T extends Document>(
//     collection: string,
//     document: Omit<T, "_id">
//   ): Promise<T> {
//     this.ensureInitialized();
    
//     try {
//       await this.ensureTableExists(collection);
      
//       const tableName = this.getTableNameForCollection(collection);
//       const now = new Date().toISOString();
      
//       // Create a new object with metadata
//       const newDocument = {
//         ...document,
//         _id: (document as Document)._id || uuidv4(),
//         _createdAt: now,
//         _updatedAt: now,
//       };
      
//       // Convert to DynamoDB-compatible format
//       const dbDocument = this.convertToDbFormat(newDocument);
      
//       await this.docClient.send(
//         new PutCommand({
//           TableName: tableName,
//           Item: dbDocument,
//         })
//       );
      
//       return dbDocument as T;
//     } catch (error) {
//       console.error(`Error inserting document into ${collection}:`, error);
//       throw new Error(`Failed to insert document: ${(error as Error).message}`);
//     }
//   }

//   // Helper method to convert query object to DynamoDB filter expressions
//   private buildFilterExpression(query: Record<string, unknown>): { 
//     FilterExpression?: string; 
//     ExpressionAttributeNames?: Record<string, string>;
//     ExpressionAttributeValues?: Record<string, unknown>;
//   } {
//     if (!query || Object.keys(query).length === 0) {
//       return {};
//     }
    
//     const expressionParts: string[] = [];
//     const expressionAttributeNames: Record<string, string> = {};
//     const expressionAttributeValues: Record<string, unknown> = {};
    
//     Object.entries(query).forEach(([key, value], index) => {
//       if (key === '_id') {
//         // _id is the primary key, handle separately
//         return;
//       }
      
//       const attributeName = `#attr${index}`;
//       const attributeValue = `:val${index}`;
      
//       expressionAttributeNames[attributeName] = key;
//       expressionAttributeValues[attributeValue] = value;
      
//       expressionParts.push(`${attributeName} = ${attributeValue}`);
//     });
    
//     if (expressionParts.length === 0) {
//       return {};
//     }
    
//     return {
//       FilterExpression: expressionParts.join(' AND '),
//       ExpressionAttributeNames: expressionAttributeNames,
//       ExpressionAttributeValues: expressionAttributeValues,
//     };
//   }

//   async find<T extends Document>(
//     collection: string,
//     query: Partial<T> = {},
//     options: { skip?: number; limit?: number } = {}
//   ): Promise<T[]> {
//     this.ensureInitialized();
//     await this.ensureTableExists(collection);
    
//     const tableName = this.getTableNameForCollection(collection);
//     const { skip = 0, limit } = options;
    
//     // If query has _id, use GetItem for efficiency
//     if (query._id && Object.keys(query).length === 1) {
//       try {
//         const result = await this.docClient.send(
//           new GetCommand({
//             TableName: tableName,
//             Key: { _id: query._id },
//           })
//         );
        
//         return result.Item ? [result.Item as T] : [];
//       } catch (error) {
//         console.error('Error finding by ID:', error);
//         return [];
//       }
//     }
    
//     // Otherwise, use scan with filters
//     const filterExpressions = this.buildFilterExpression(query as Record<string, unknown>);
//     const scanParams: ScanCommandInput = {
//       TableName: tableName,
//       ...filterExpressions,
//     };
    
//     if (limit) {
//       scanParams.Limit = limit + skip;
//     }
    
//     const results: T[] = [];
//     let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;
//     let itemsScanned = 0;
    
//     do {
//       if (lastEvaluatedKey) {
//         scanParams.ExclusiveStartKey = lastEvaluatedKey;
//       }
      
//       const response = await this.docClient.send(new ScanCommand(scanParams));
      
//       if (response.Items) {
//         for (const item of response.Items) {
//           itemsScanned++;
          
//           if (itemsScanned > skip) {
//             results.push(item as T);
            
//             if (limit && results.length >= limit) {
//               break;
//             }
//           }
//         }
//       }
      
//       lastEvaluatedKey = response.LastEvaluatedKey;
//     } while (lastEvaluatedKey && (!limit || results.length < limit));
    
//     return results;
//   }

//   async findOne<T extends Document>(
//     collection: string,
//     query: Partial<T>
//   ): Promise<T | null> {
//     this.ensureInitialized();
    
//     const results = await this.find(collection, query, { limit: 1 });
//     return results.length > 0 ? results[0] : null;
//   }

//   async update<T extends Document>(
//     collection: string,
//     query: Partial<T>,
//     update: Partial<T>
//   ): Promise<number> {
//     this.ensureInitialized();
//     await this.ensureTableExists(collection);
    
//     const tableName = this.getTableNameForCollection(collection);
    
//     // First find the document(s) to update
//     const docsToUpdate = await this.find(collection, query);
    
//     if (docsToUpdate.length === 0) {
//       return 0;
//     }
    
//     let updatedCount = 0;
    
//     for (const doc of docsToUpdate) {
//       // Prepare update data
//       const updateData = {
//         ...doc,  // Start with existing document
//         ...update, // Apply updates
//         _id: doc._id, // Ensure ID doesn't change
//         _createdAt: doc._createdAt, // Preserve creation time
//         _updatedAt: new Date().toISOString(), // Update modification time
//       };
      
//       // Convert dates to ISO strings
//       const dbDocument = this.convertToDbFormat(updateData);
      
//       try {
//         await this.docClient.send(
//           new PutCommand({
//             TableName: tableName,
//             Item: dbDocument,
//           })
//         );
//         updatedCount++;
//       } catch (error) {
//         console.error(`Error updating document ${doc._id}:`, error);
//       }
//     }
    
//     return updatedCount;
//   }

//   async delete<T extends Document>(
//     collection: string,
//     query: Partial<T>
//   ): Promise<number> {
//     this.ensureInitialized();
//     await this.ensureTableExists(collection);
    
//     const tableName = this.getTableNameForCollection(collection);
    
//     // If using _id, use direct delete
//     if (query._id && Object.keys(query).length === 1) {
//       try {
//         await this.docClient.send(
//           new DeleteCommand({
//             TableName: tableName,
//             Key: { _id: query._id },
//           })
//         );
//         return 1;
//       } catch (error) {
//         console.error(`Error deleting document with ID ${query._id}:`, error);
//         return 0;
//       }
//     }
    
//     // Otherwise find all matching documents and delete them
//     const docsToDelete = await this.find(collection, query);
    
//     if (docsToDelete.length === 0) {
//       return 0;
//     }
    
//     let deletedCount = 0;
    
//     // Delete in batches
//     const batches = [];
//     for (let i = 0; i < docsToDelete.length; i += this.maxBatchSize) {
//       const batch = docsToDelete.slice(i, i + this.maxBatchSize);
      
//       const batchItems = batch.map(doc => ({
//         DeleteRequest: {
//           Key: { _id: doc._id }
//         }
//       }));
      
//       batches.push(batchItems);
//     }
    
//     for (const batchItems of batches) {
//       try {
//         const batchParams: BatchWriteCommandInput = {
//           RequestItems: {
//             [tableName]: batchItems
//           }
//         };
        
//         await this.docClient.send(new BatchWriteCommand(batchParams));
//         deletedCount += batchItems.length;
//       } catch (error) {
//         console.error('Error batch deleting documents:', error);
//       }
//     }
    
//     return deletedCount;
//   }

//   async deleteAll<T extends Document>(collection: string): Promise<number> {
//     this.ensureInitialized();
//     await this.ensureTableExists(collection);
    
//     const tableName = this.getTableNameForCollection(collection);
    
//     // Get all documents
//     const allDocs = await this.getCollection(collection);
//     const count = allDocs.length;
    
//     if (count === 0) {
//       return 0;
//     }
    
//     // Delete all documents in batches
//     const batches = [];
//     for (let i = 0; i < allDocs.length; i += this.maxBatchSize) {
//       const batch = allDocs.slice(i, i + this.maxBatchSize);
      
//       const batchItems = batch.map(doc => ({
//         DeleteRequest: {
//           Key: { _id: doc._id }
//         }
//       }));
      
//       batches.push(batchItems);
//     }
    
//     for (const batchItems of batches) {
//       const batchParams: BatchWriteCommandInput = {
//         RequestItems: {
//           [tableName]: batchItems
//         }
//       };
      
//       await this.docClient.send(new BatchWriteCommand(batchParams));
//     }
    
//     return count;
//   }

//   async count<T extends Document>(
//     collection: string,
//     query: Partial<T> = {}
//   ): Promise<number> {
//     this.ensureInitialized();
    
//     // For simple counts, consider using a more efficient approach
//     if (Object.keys(query).length === 0) {
//       try {
//         await this.ensureTableExists(collection);
//         const tableName = this.getTableNameForCollection(collection);
        
//         // Use Select COUNT for better performance
//         const scanParams: ScanCommandInput = {
//           TableName: tableName,
//           Select: "COUNT",
//         };
        
//         let totalCount = 0;
//         let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;
        
//         do {
//           if (lastEvaluatedKey) {
//             scanParams.ExclusiveStartKey = lastEvaluatedKey;
//           }
          
//           const response = await this.docClient.send(new ScanCommand(scanParams));
//           totalCount += response.Count || 0;
//           lastEvaluatedKey = response.LastEvaluatedKey;
//         } while (lastEvaluatedKey);
        
//         return totalCount;
//       } catch (error) {
//         console.error(`Error counting documents in ${collection}:`, error);
//         return 0;
//       }
//     }
    
//     // For filtered counts, we need to get all matching documents
//     const docs = await this.find(collection, query);
//     return docs.length;
//   }

//   async getSingleton<T extends Document>(name: string): Promise<T | null> {
//     this.ensureInitialized();
    
//     // Use a special collection for singletons
//     const singletonCollection = "singletons";
//     await this.ensureTableExists(singletonCollection);
    
//     const result = await this.findOne(singletonCollection, { _id: name } as Partial<Document>);
    
//     if (!result) {
//       // Initialize with empty document
//       const now = new Date().toISOString();
//       const initialDoc = {
//         _id: name,
//         _createdAt: now,
//         _updatedAt: now,
//       };
      
//       await this.insert(singletonCollection, initialDoc);
//       return await this.findOne(singletonCollection, { _id: name } as Partial<Document>) as T | null;
//     }
    
//     return result as T;
//   }

//   async updateSingleton<T extends Document>(
//     name: string,
//     data: Partial<T>
//   ): Promise<T> {
//     this.ensureInitialized();
    
//     const singletonCollection = "singletons";
//     await this.ensureTableExists(singletonCollection);
    
//     const existing = await this.findOne(singletonCollection, { _id: name } as Partial<Document>);
    
//     if (!existing) {
//       // Create if it doesn't exist
//       const now = new Date().toISOString();
//       const newDoc = {
//         _id: name,
//         ...data,
//         _createdAt: now,
//         _updatedAt: now,
//       } as Partial<Document>;
      
//       await this.insert(singletonCollection, newDoc);
//     } else {
//       // Update existing
//       const updateData = {
//         ...existing,
//         ...data,
//         _updatedAt: new Date().toISOString(),
//       };
      
//       await this.update(
//         singletonCollection,
//         { _id: name } as Partial<Document>,
//         updateData as Partial<Document>
//       );
//     }
    
//     const result = await this.findOne(singletonCollection, { _id: name } as Partial<Document>);
//     if (!result) {
//       throw new Error(`Failed to update singleton ${name}`);
//     }
//     return result as T;
//   }
// }