import {
    GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLBoolean, GraphQLList,
    GraphQLNonNull, GraphQLInt, GraphQLFloat, GraphQLScalarType, Kind,
    GraphQLFieldConfigMap, GraphQLOutputType, GraphQLInputType, GraphQLInputObjectType,
    GraphQLInputFieldConfigMap
} from 'graphql';
import { CMS } from '../core/cms';
import { CMSSchema, CollectionSchema, SingletonSchema, Document, CompleteFieldSchema } from '@nullcms/shared';
import { z } from 'zod'; // Import zod
import { createHandler } from 'graphql-http/lib/use/fetch';
import { Hono } from 'hono';
import {Variables} from "../index";


// Use the Zod schema's inferred type for FieldSchema
type FieldSchemaType = z.infer<typeof CompleteFieldSchema>;

// Define proper types for scalar values
type DateValue = Date | string;
type RichTextValue = string | Record<string, string>;
type ImageValue = string | { url: string; alt?: string; width?: number; height?: number };
type DocumentValue = string | number | boolean | DateValue | RichTextValue | ImageValue;

// Custom scalar for Date
const GraphQLDate = new GraphQLScalarType({
    name: 'Date',
    description: 'Date custom scalar type',
    serialize(value: unknown): string {
        const typedValue = value as DateValue;
        return typedValue instanceof Date ? typedValue.toISOString() : String(typedValue);
    },
    parseValue(value: unknown): Date {
        return new Date(value as string);
    },
    parseLiteral(ast): Date | null {
        if (ast.kind === Kind.STRING) {
            return new Date(ast.value);
        }
        return null;
    }
});

// Custom scalar for Rich Text
const GraphQLRichText = new GraphQLScalarType({
    name: 'RichText',
    description: 'Rich text content',
    serialize(value: unknown): RichTextValue {
        return value as RichTextValue;
    },
    parseValue(value: unknown): RichTextValue {
        return value as RichTextValue;
    },
    parseLiteral(ast): string | null {
        if (ast.kind === Kind.STRING) {
            return ast.value;
        }
        return null;
    }
});

// Custom scalar for Image
const GraphQLImage = new GraphQLScalarType({
    name: 'Image',
    description: 'Image content',
    serialize(value: unknown): ImageValue {
        return value as ImageValue;
    },
    parseValue(value: unknown): ImageValue {
        return value as ImageValue;
    },
    parseLiteral(ast): string | null {
        if (ast.kind === Kind.STRING) {
            return ast.value;
        }
        if (ast.kind === Kind.OBJECT) {
            return JSON.stringify(ast);
        }
        return null;
    }
});

interface CollectionInputTypes {
    createInputType: GraphQLInputObjectType;
    updateInputType: GraphQLInputObjectType;
}

// Strong typing for resolver arguments
interface DocumentQueryArgs {
    skip: number;
    limit: number;
}

interface DocumentByIdArgs {
    id: string;
}

interface CreateDocumentArgs<T extends Record<string, DocumentValue>> {
    data: T;
}

interface UpdateDocumentArgs<T extends Record<string, DocumentValue>> {
    id: string;
    data: T;
}

interface DeleteDocumentArgs {
    id: string;
}

interface UpdateSingletonArgs<T extends Record<string, DocumentValue>> {
    data: T;
}

// Context type
interface GraphQLContext {
    cms: CMS;
}

export class GraphQLBuilder {
    private cms: CMS;
    private schema: CMSSchema;
    private outputTypeCache: Map<string, GraphQLObjectType> = new Map();
    private inputTypeCache: Map<string, GraphQLInputObjectType> = new Map();
    private graphQLSchema: GraphQLSchema | null = null;

    constructor(cms: CMS, schema: CMSSchema) {
        this.cms = cms;
        this.schema = schema;
    }

    /**
     * Maps CMS field types to GraphQL output types
     */
    private mapFieldTypeToGraphQLOutput(field: FieldSchemaType, typeName: string): GraphQLOutputType {
        let type: GraphQLOutputType;

        switch (field.type) {
            case 'string':
                type = GraphQLString;
                break;
            case 'number':
                type = GraphQLFloat;
                break;
            case 'boolean':
                type = GraphQLBoolean;
                break;
            case 'date':
                type = GraphQLDate;
                break;
            case 'richtext':
                type = GraphQLRichText;
                break;
            case 'image':
                type = GraphQLImage;
                break;
            case 'array':
                if (field.of) {
                    const innerType = this.mapFieldTypeToGraphQLOutput(field.of, `${typeName}Item`);
                    type = new GraphQLList(innerType);
                } else {
                    type = new GraphQLList(GraphQLString); // Default to string array if not specified
                }
                break;
            case 'reference':
                if (field.collection && this.schema.collections?.[field.collection]) {
                    // Create or get the referenced type
                    const refTypeName = `${field.collection.charAt(0).toUpperCase() + field.collection.slice(1)}`;
                    if (!this.outputTypeCache.has(refTypeName)) {
                        // Create a placeholder to prevent infinite recursion
                        this.outputTypeCache.set(refTypeName, new GraphQLObjectType({
                            name: refTypeName,
                            fields: () => ({
                                _id: { type: new GraphQLNonNull(GraphQLString) }
                            })
                        }));
                        const collectionType = this.createCollectionType(field.collection, this.schema.collections[field.collection]);
                        this.outputTypeCache.set(refTypeName, collectionType);
                    }
                    type = this.outputTypeCache.get(refTypeName)!;
                } else {
                    type = GraphQLString; // Fallback if collection is missing
                }
                break;
            default:
                type = GraphQLString; // Default fallback
        }

        // Make non-nullable if required
        if (field.required) {
            type = new GraphQLNonNull(type);
        }

        return type;
    }

    /**
     * Maps CMS field types to GraphQL input types
     */
    private mapFieldTypeToGraphQLInput(field: FieldSchemaType, typeName: string): GraphQLInputType {
        let type: GraphQLInputType;

        switch (field.type) {
            case 'string':
                type = GraphQLString;
                break;
            case 'number':
                type = GraphQLFloat;
                break;
            case 'integer':
                type = GraphQLInt;
                break;
            case 'boolean':
                type = GraphQLBoolean;
                break;
            case 'date':
                type = GraphQLDate;
                break;
            case 'richtext':
                type = GraphQLRichText;
                break;
            case 'image':
                type = GraphQLImage;
                break;
            case 'array':
                if (field.of) {
                    const innerType = this.mapFieldTypeToGraphQLInput(field.of, `${typeName}Item`);
                    type = new GraphQLList(innerType);
                } else {
                    type = new GraphQLList(GraphQLString); // Default to string array if not specified
                }
                break;
            case 'reference':
                // References in input types are just IDs
                type = GraphQLString;
                break;
            default:
                type = GraphQLString; // Default fallback
        }

        // Make non-nullable if required
        if (field.required) {
            type = new GraphQLNonNull(type);
        }

        return type;
    }

    /**
     * Creates a GraphQL type for a collection
     */
    private createCollectionType(name: string, schema: CollectionSchema): GraphQLObjectType {
        const typeName = name.charAt(0).toUpperCase() + name.slice(1);

        // Return from cache if already created
        if (this.outputTypeCache.has(typeName)) {
            return this.outputTypeCache.get(typeName)!;
        }

        // Define the type
        const type = new GraphQLObjectType({
            name: typeName,
            description: schema.description,
            fields: () => {
                const fields: GraphQLFieldConfigMap<Document, GraphQLContext> = {
                    _id: { type: new GraphQLNonNull(GraphQLString) }
                };

                // Add timestamp fields if enabled
                if (schema.timestamps) {
                    fields._createdAt = { type: GraphQLDate };
                    fields._updatedAt = { type: GraphQLDate };
                }

                // Add all schema fields
                if (schema.fields) {
                    for (const [fieldName, fieldSchema] of Object.entries(schema.fields)) {
                        fields[fieldName] = {
                            type: this.mapFieldTypeToGraphQLOutput(fieldSchema as FieldSchemaType, `${typeName}${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`),
                            description: fieldSchema.label || fieldName
                        };
                    }
                }

                return fields;
            }
        });

        // Store in cache
        this.outputTypeCache.set(typeName, type);
        return type;
    }

    /**
     * Creates a GraphQL type for a singleton
     */
    private createSingletonType(name: string, schema: SingletonSchema): GraphQLObjectType {
        const typeName = `${name.charAt(0).toUpperCase() + name.slice(1)}Singleton`;

        // Return from cache if already created
        if (this.outputTypeCache.has(typeName)) {
            return this.outputTypeCache.get(typeName)!;
        }

        // Define the type
        const type = new GraphQLObjectType({
            name: typeName,
            description: schema.description,
            fields: () => {
                const fields: GraphQLFieldConfigMap<Document, GraphQLContext> = {
                    _id: { type: new GraphQLNonNull(GraphQLString) }
                };

                // Add timestamp fields if enabled
                if (schema.timestamps) {
                    fields._createdAt = { type: GraphQLDate };
                    fields._updatedAt = { type: GraphQLDate };
                }

                // Add all schema fields
                if (schema.fields) {
                    for (const [fieldName, fieldSchema] of Object.entries(schema.fields)) {
                        fields[fieldName] = {
                            type: this.mapFieldTypeToGraphQLOutput(fieldSchema as FieldSchemaType, `${typeName}${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`),
                            description: fieldSchema.label || fieldName
                        };
                    }
                }

                return fields;
            }
        });

        // Store in cache
        this.outputTypeCache.set(typeName, type);
        return type;
    }

    /**
     * Creates input types for collection mutations
     */
    private createCollectionInputTypes(name: string, schema: CollectionSchema): CollectionInputTypes {
        const createTypeName = `Create${name.charAt(0).toUpperCase() + name.slice(1)}Input`;
        const updateTypeName = `Update${name.charAt(0).toUpperCase() + name.slice(1)}Input`;

        // Check cache for existing types
        if (this.inputTypeCache.has(createTypeName) && this.inputTypeCache.has(updateTypeName)) {
            return {
                createInputType: this.inputTypeCache.get(createTypeName) as GraphQLInputObjectType,
                updateInputType: this.inputTypeCache.get(updateTypeName) as GraphQLInputObjectType
            };
        }

        // Create Input Type
        const createInputFields: GraphQLInputFieldConfigMap = {};

        // Add all schema fields
        if (schema.fields) {
            for (const [fieldName, fieldSchema] of Object.entries(schema.fields)) {
                // Skip system fields
                if (fieldName.startsWith('_')) continue;

                const typedFieldSchema = fieldSchema as FieldSchemaType;

                createInputFields[fieldName] = {
                    type: typedFieldSchema.required
                        ? this.ensureNonNullType(this.mapFieldTypeToGraphQLInput(typedFieldSchema, `${createTypeName}${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`))
                        : this.mapFieldTypeToGraphQLInput(typedFieldSchema, `${createTypeName}${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`),
                    description: typedFieldSchema.label || fieldName
                };
            }
        }

        const createInputType = new GraphQLInputObjectType({
            name: createTypeName,
            fields: createInputFields
        });

        // Update Input Type (same as create but all fields optional)
        const updateInputFields: GraphQLInputFieldConfigMap = {};

        // Add all schema fields
        if (schema.fields) {
            for (const [fieldName, fieldSchema] of Object.entries(schema.fields)) {
                // Skip system fields
                if (fieldName.startsWith('_')) continue;

                const typedFieldSchema = fieldSchema as FieldSchemaType;

                // Make all fields optional for updates
                const fieldType = this.mapFieldTypeToGraphQLInput(typedFieldSchema, `${updateTypeName}${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`);
                const nonNullableType = fieldType instanceof GraphQLNonNull ? fieldType.ofType : fieldType;

                updateInputFields[fieldName] = {
                    type: nonNullableType,
                    description: typedFieldSchema.label || fieldName
                };
            }
        }

        const updateInputType = new GraphQLInputObjectType({
            name: updateTypeName,
            fields: updateInputFields
        });

        // Store in cache
        this.inputTypeCache.set(createTypeName, createInputType);
        this.inputTypeCache.set(updateTypeName, updateInputType);

        return { createInputType, updateInputType };
    }

    /**
     * Creates input type for singleton mutations
     */
    private createSingletonInputType(name: string, schema: SingletonSchema): GraphQLInputObjectType {
        const typeName = `Update${name.charAt(0).toUpperCase() + name.slice(1)}Input`;

        // Check cache
        if (this.inputTypeCache.has(typeName)) {
            return this.inputTypeCache.get(typeName) as GraphQLInputObjectType;
        }

        // Update Input Type
        const updateInputFields: GraphQLInputFieldConfigMap = {};

        // Add all schema fields
        if (schema.fields) {
            for (const [fieldName, fieldSchema] of Object.entries(schema.fields)) {
                // Skip system fields
                if (fieldName.startsWith('_')) continue;

                const typedFieldSchema = fieldSchema as FieldSchemaType;

                // Make all fields optional for updates
                const fieldType = this.mapFieldTypeToGraphQLInput(typedFieldSchema, `${typeName}${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`);
                const nonNullableType = fieldType instanceof GraphQLNonNull ? fieldType.ofType : fieldType;

                updateInputFields[fieldName] = {
                    type: nonNullableType,
                    description: typedFieldSchema.label || fieldName
                };
            }
        }

        const updateInputType = new GraphQLInputObjectType({
            name: typeName,
            fields: updateInputFields
        });

        // Store in cache
        this.inputTypeCache.set(typeName, updateInputType);

        return updateInputType;
    }

    /**
     * Builds a complete GraphQL schema for the CMS
     */
    public buildSchema(): GraphQLSchema {
        // Return cached schema if already built
        if (this.graphQLSchema) {
            return this.graphQLSchema;
        }

        // Build Query type
        const queryFields: GraphQLFieldConfigMap<any, GraphQLContext> = {};

        // Add collection queries
        if (this.schema.collections) {
            for (const [collectionName, collectionSchema] of Object.entries(this.schema.collections)) {
                const collectionType = this.createCollectionType(collectionName, collectionSchema);

                // Get all documents
                queryFields[collectionName] = {
                    type: new GraphQLList(collectionType),
                    args: {
                        skip: { type: GraphQLInt },
                        limit: { type: GraphQLInt }
                    },
                    resolve: async (_: any, args: DocumentQueryArgs, context: GraphQLContext): Promise<Document[]> => {
                        return await context.cms.getCollectionDocuments(collectionName, {
                            skip: args.skip || 0,
                            limit: args.limit || 50
                        });
                    }
                };

                // Get single document
                queryFields[`${collectionName}ById`] = {
                    type: collectionType,
                    args: {
                        id: { type: new GraphQLNonNull(GraphQLString) }
                    },
                    resolve: async (_: any, args: DocumentByIdArgs, context: GraphQLContext): Promise<Document | null> => {
                        return await context.cms.getDocument(collectionName, args.id);
                    }
                };
            }
        }

        // Add singleton queries
        if (this.schema.singletons) {
            for (const [singletonName, singletonSchema] of Object.entries(this.schema.singletons)) {
                const singletonType = this.createSingletonType(singletonName, singletonSchema);

                queryFields[singletonName] = {
                    type: singletonType,
                    resolve: async (_: any, __: Record<string, never>, context: GraphQLContext): Promise<Document | null> => {
                        return await context.cms.getSingleton(singletonName);
                    }
                };
            }
        }

        // Build Mutation type
        const mutationFields: GraphQLFieldConfigMap<any, GraphQLContext> = {};

        // Add collection mutations
        if (this.schema.collections) {
            for (const [collectionName, collectionSchema] of Object.entries(this.schema.collections)) {
                const collectionType = this.createCollectionType(collectionName, collectionSchema);
                const { createInputType, updateInputType } = this.createCollectionInputTypes(collectionName, collectionSchema);

                // Create document
                mutationFields[`create${collectionName.charAt(0).toUpperCase() + collectionName.slice(1)}`] = {
                    type: collectionType,
                    args: {
                        data: { type: new GraphQLNonNull(createInputType) }
                    },
                    resolve: async (_: any, args: CreateDocumentArgs<Record<string, DocumentValue>>, context: GraphQLContext): Promise<Document> => {
                        return await context.cms.createDocument(collectionName, args.data);
                    }
                };

                // Update document
                mutationFields[`update${collectionName.charAt(0).toUpperCase() + collectionName.slice(1)}`] = {
                    type: collectionType,
                    args: {
                        id: { type: new GraphQLNonNull(GraphQLString) },
                        data: { type: new GraphQLNonNull(updateInputType) }
                    },
                    resolve: async (_: any, args: UpdateDocumentArgs<Record<string, DocumentValue>>, context: GraphQLContext): Promise<Document | null> => {
                        return await context.cms.updateDocument(collectionName, args.id, args.data);
                    }
                };

                // Delete document
                mutationFields[`delete${collectionName.charAt(0).toUpperCase() + collectionName.slice(1)}`] = {
                    type: GraphQLBoolean,
                    args: {
                        id: { type: new GraphQLNonNull(GraphQLString) }
                    },
                    resolve: async (_: any, args: DeleteDocumentArgs, context: GraphQLContext): Promise<boolean> => {
                        return await context.cms.deleteDocument(collectionName, args.id);
                    }
                };
            }
        }

        // Add singleton mutations
        if (this.schema.singletons) {
            for (const [singletonName, singletonSchema] of Object.entries(this.schema.singletons)) {
                const singletonType = this.createSingletonType(singletonName, singletonSchema);
                const updateInputType = this.createSingletonInputType(singletonName, singletonSchema);

                // Update singleton
                mutationFields[`update${singletonName.charAt(0).toUpperCase() + singletonName.slice(1)}`] = {
                    type: singletonType,
                    args: {
                        data: { type: new GraphQLNonNull(updateInputType) }
                    },
                    resolve: async (_: any, args: UpdateSingletonArgs<Record<string, DocumentValue>>, context: GraphQLContext): Promise<Document | null> => {
                        return await context.cms.updateSingleton(singletonName, args.data);
                    }
                };
            }
        }

        // Create the schema with the proper types
        this.graphQLSchema = new GraphQLSchema({
            query: new GraphQLObjectType({
                name: 'Query',
                fields: queryFields
            }),
            mutation: new GraphQLObjectType({
                name: 'Mutation',
                fields: mutationFields
            })
        });

        return this.graphQLSchema;
    }
    private ensureNonNullType(type: GraphQLInputType): GraphQLInputType {
        return type instanceof GraphQLNonNull ? type : new GraphQLNonNull(type);
    }
}

export function createGraphQLApiRoute(cms: CMS, app: Hono<{ Variables: Variables }>): void {
    const schema = cms.getSchema();
    const graphqlBuilder = new GraphQLBuilder(cms, schema);

    // Generate schema at startup
    const graphqlSchema = graphqlBuilder.buildSchema();

    // Create GraphQL HTTP handler
    const handler = createHandler({
        schema: graphqlSchema,
        context: () => ({ cms })
    });

    // Register the handler to your Hono app
    app.all('/graphql', async (c) => {
        return await handler(c.req.raw);
    });
}