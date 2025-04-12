import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { Context } from "hono";
import type { CMS } from "../core/cms";
import type { Variables } from "../index";

const DocumentSchema = z
	.object({
		_id: z.string(),
		_createdAt: z.string().optional(),
		_updatedAt: z.string().optional(),
	})
	.catchall(z.any());

const DocumentInputSchema = DocumentSchema.omit({
	_id: true,
	_createdAt: true,
	_updatedAt: true,
});
const DocumentUpdateSchema = DocumentInputSchema.partial();
const CollectionQuerySchema = z.object({
	skip: z.string().optional().transform(Number),
	limit: z.string().optional().transform(Number),
});
const IdParamSchema = z.object({
	id: z.string(),
});
const CollectionParamSchema = z.object({
	collection: z.string(),
});
const SingletonParamSchema = z.object({
	singleton: z.string(),
});

// Error response schema
const ErrorResponseSchema = z.object({
	error: z.string(),
});

// Success response schemas
const CollectionsResponseSchema = z.object({
	collections: z.array(z.string()),
});

const DocumentsResponseSchema = z.object({
	documents: z.array(DocumentSchema),
});

const SchemaResponseSchema = z.object({
	schema: z.record(z.any()).nullable(),
});

const DeleteSuccessSchema = z.object({
	success: z.boolean(),
});

const SingletonsResponseSchema = z.object({
	singletons: z.array(z.string()),
});

export function createRestApiRoutes(
	cms: CMS,
): OpenAPIHono<{ Variables: Variables }> {
	const api: OpenAPIHono<{ Variables: Variables }> = new OpenAPIHono();

	// Collections
	api.openapi(
		createRoute({
			method: "get",
			path: "/collections",
			tags: ["Collections"],
			summary: "Get all collections",
			responses: {
				200: {
					description: "List of collection names",
					content: {
						"application/json": {
							schema: CollectionsResponseSchema,
						},
					},
				},
				500: {
					description: "Internal server error",
					content: {
						"application/json": {
							schema: ErrorResponseSchema,
						},
					},
				},
			},
		}),
		async (c) => {
			try {
				const collections = await cms.getCollections();
				return c.json({ collections }, 200);
			} catch (error) {
				return c.json({ error: (error as Error).message }, 500);
			}
		},
	);

	api.openapi(
		createRoute({
			method: "get",
			path: "/collections/:collection/schema",
			tags: ["Collections"],
			summary: "Get schema for a specific collection",
			request: {
				params: CollectionParamSchema,
			},
			responses: {
				200: {
					description: "Collection schema",
					content: {
						"application/json": {
							schema: SchemaResponseSchema,
						},
					},
				},
				404: {
					description: "Collection not found",
					content: {
						"application/json": {
							schema: ErrorResponseSchema,
						},
					},
				},
				500: {
					description: "Internal server error",
					content: {
						"application/json": {
							schema: ErrorResponseSchema,
						},
					},
				},
			},
		}),
		async (c) => {
			try {
				const { collection } = c.req.valid("param");
				const schema = await cms.getCollectionSchema(collection);

				if (!schema) {
					return c.json({ error: `Collection '${collection}' not found` }, 404);
				}

				return c.json({ schema }, 200);
			} catch (error) {
				return c.json({ error: (error as Error).message }, 500);
			}
		},
	);

	api.openapi(
		createRoute({
			method: "get",
			path: "/collections/:collection/documents",
			tags: ["Documents"],
			summary: "Get all documents in a collection",
			request: {
				params: CollectionParamSchema,
				query: CollectionQuerySchema,
			},
			responses: {
				200: {
					description: "List of documents",
					content: {
						"application/json": {
							schema: DocumentsResponseSchema,
						},
					},
				},
				404: {
					description: "Collection not found",
					content: {
						"application/json": {
							schema: ErrorResponseSchema,
						},
					},
				},
				500: {
					description: "Internal server error",
					content: {
						"application/json": {
							schema: ErrorResponseSchema,
						},
					},
				},
			},
		}),
		async (c) => {
			try {
				const { collection } = c.req.valid("param");
				const { skip, limit } = c.req.valid("query");

				const options = {
					skip: 0,
					limit: 50,
				};

				if (skip) {
					options.skip = skip;
				}

				if (limit) {
					options.limit = limit;
				}

				const documents = await cms.getCollectionDocuments(collection, options);
				return c.json({ documents }, 200);
			} catch (error) {
				if ((error as Error).message.includes("not found in schema")) {
					return c.json({ error: (error as Error).message }, 404);
				}
				return c.json({ error: (error as Error).message }, 500);
			}
		},
	);

	api.openapi(
		createRoute({
			method: "get",
			path: "/collections/:collection/documents/:id",
			tags: ["Documents"],
			summary: "Get a specific document by ID",
			request: {
				params: CollectionParamSchema.merge(IdParamSchema),
			},
			responses: {
				200: {
					description: "Document",
					content: {
						"application/json": {
							schema: DocumentSchema,
						},
					},
				},
				404: {
					description: "Collection or document not found",
					content: {
						"application/json": {
							schema: ErrorResponseSchema,
						},
					},
				},
				500: {
					description: "Internal server error",
					content: {
						"application/json": {
							schema: ErrorResponseSchema,
						},
					},
				},
			},
		}),
		async (c) => {
			try {
				const { collection, id } = c.req.valid("param");
				const document = await cms.getDocument(collection, id);

				if (!document) {
					return c.json(
						{
							error: `Document with ID '${id}' not found in collection '${collection}'`,
						},
						404,
					);
				}

				return c.json(document, 200);
			} catch (error) {
				if ((error as Error).message.includes("not found in schema")) {
					return c.json({ error: (error as Error).message }, 404);
				}
				return c.json({ error: (error as Error).message }, 500);
			}
		},
	);

	api.openapi(
		createRoute({
			method: "post",
			path: "/collections/:collection/documents",
			tags: ["Documents"],
			summary: "Create a new document",
			request: {
				params: CollectionParamSchema,
				body: {
					content: {
						"application/json": {
							schema: DocumentInputSchema,
						},
					},
				},
			},
			responses: {
				201: {
					description: "Created document",
					content: {
						"application/json": {
							schema: DocumentSchema,
						},
					},
				},
				400: {
					description: "Invalid input",
					content: {
						"application/json": {
							schema: ErrorResponseSchema,
						},
					},
				},
				404: {
					description: "Collection not found",
					content: {
						"application/json": {
							schema: ErrorResponseSchema,
						},
					},
				},
				500: {
					description: "Internal server error",
					content: {
						"application/json": {
							schema: ErrorResponseSchema,
						},
					},
				},
			},
		}),
		async (c) => {
			try {
				const { collection } = c.req.valid("param");
				const data = await c.req.json();

				const document = await cms.createDocument(collection, data);
				return c.json(document, 201);
			} catch (error) {
				if ((error as Error).message.includes("not found in schema")) {
					return c.json({ error: (error as Error).message }, 404);
				}
				if ((error as Error).message.includes("validation")) {
					return c.json({ error: (error as Error).message }, 400);
				}
				return c.json({ error: (error as Error).message }, 500);
			}
		},
	);

	api.openapi(
		createRoute({
			method: "patch",
			path: "/collections/:collection/documents/:id",
			tags: ["Documents"],
			summary: "Update a document",
			request: {
				params: CollectionParamSchema.merge(IdParamSchema),
				body: {
					content: {
						"application/json": {
							schema: DocumentUpdateSchema,
						},
					},
				},
			},
			responses: {
				200: {
					description: "Updated document",
					content: {
						"application/json": {
							schema: DocumentSchema,
						},
					},
				},
				400: {
					description: "Invalid input",
					content: {
						"application/json": {
							schema: ErrorResponseSchema,
						},
					},
				},
				404: {
					description: "Collection or document not found",
					content: {
						"application/json": {
							schema: ErrorResponseSchema,
						},
					},
				},
				500: {
					description: "Internal server error",
					content: {
						"application/json": {
							schema: ErrorResponseSchema,
						},
					},
				},
			},
		}),
		async (c) => {
			try {
				const { collection, id } = c.req.valid("param");
				const data = await c.req.json();

				const document = await cms.updateDocument(collection, id, data);

				if (!document) {
					c.status(404);
					return c.json(
						{
							error: `Document with ID '${id}' not found in collection '${collection}'`,
						},
						404,
					);
				}

				return c.json(document, 200);
			} catch (error) {
				if ((error as Error).message.includes("not found in schema")) {
					return c.json({ error: (error as Error).message }, 404);
				}
				if ((error as Error).message.includes("validation")) {
					return c.json({ error: (error as Error).message }, 400);
				}
				return c.json({ error: (error as Error).message }, 500);
			}
		},
	);

	api.openapi(
		createRoute({
			method: "delete",
			path: "/collections/:collection/documents/:id",
			tags: ["Documents"],
			summary: "Delete a document",
			request: {
				params: CollectionParamSchema.merge(IdParamSchema),
			},
			responses: {
				200: {
					description: "Delete confirmation",
					content: {
						"application/json": {
							schema: DeleteSuccessSchema,
						},
					},
				},
				404: {
					description: "Collection or document not found",
					content: {
						"application/json": {
							schema: ErrorResponseSchema,
						},
					},
				},
				500: {
					description: "Internal server error",
					content: {
						"application/json": {
							schema: ErrorResponseSchema,
						},
					},
				},
			},
		}),
		async (c) => {
			try {
				const { collection, id } = c.req.valid("param");
				const success = await cms.deleteDocument(collection, id);

				if (!success) {
					return c.json(
						{
							error: `Document with ID '${id}' not found in collection '${collection}'`,
						},
						404,
					);
				}

				return c.json({ success }, 200);
			} catch (error) {
				if ((error as Error).message.includes("not found in schema")) {
					return c.json({ error: (error as Error).message }, 404);
				}
				return c.json({ error: (error as Error).message }, 500);
			}
		},
	);

	// Singletons
	api.openapi(
		createRoute({
			method: "get",
			path: "/singletons",
			tags: ["Singletons"],
			summary: "Get all singletons",
			responses: {
				200: {
					description: "List of singleton names",
					content: {
						"application/json": {
							schema: SingletonsResponseSchema,
						},
					},
				},
				500: {
					description: "Internal server error",
					content: {
						"application/json": {
							schema: ErrorResponseSchema,
						},
					},
				},
			},
		}),
		async (c) => {
			try {
				const singletons = await cms.getSingletons();
				return c.json({ singletons }, 200);
			} catch (error) {
				return c.json({ error: (error as Error).message }, 500);
			}
		},
	);

	api.openapi(
		createRoute({
			method: "get",
			path: "/singletons/:singleton/schema",
			tags: ["Singletons"],
			summary: "Get schema for a specific singleton",
			request: {
				params: SingletonParamSchema,
			},
			responses: {
				200: {
					description: "Singleton schema",
					content: {
						"application/json": {
							schema: SchemaResponseSchema,
						},
					},
				},
				404: {
					description: "Singleton not found",
					content: {
						"application/json": {
							schema: ErrorResponseSchema,
						},
					},
				},
				500: {
					description: "Internal server error",
					content: {
						"application/json": {
							schema: ErrorResponseSchema,
						},
					},
				},
			},
		}),
		async (c) => {
			try {
				const { singleton } = c.req.valid("param");
				const schema = await cms.getSingletonSchema(singleton);

				if (!schema) {
					return c.json({ error: `Singleton '${singleton}' not found` }, 404);
				}

				return c.json({ schema }, 200);
			} catch (error) {
				return c.json({ error: (error as Error).message }, 500);
			}
		},
	);

	api.openapi(
		createRoute({
			method: "get",
			path: "/singletons/:singleton",
			tags: ["Singletons"],
			summary: "Get a singleton",
			request: {
				params: SingletonParamSchema,
			},
			responses: {
				200: {
					description: "Singleton data",
					content: {
						"application/json": {
							schema: DocumentSchema,
						},
					},
				},
				404: {
					description: "Singleton not found",
					content: {
						"application/json": {
							schema: ErrorResponseSchema,
						},
					},
				},
				500: {
					description: "Internal server error",
					content: {
						"application/json": {
							schema: ErrorResponseSchema,
						},
					},
				},
			},
		}),
		async (c) => {
			try {
				const { singleton } = c.req.valid("param");
				const data = await cms.getSingleton(singleton);

				if (!data) {
					return c.json({ error: `Singleton '${singleton}' not found` }, 404);
				}

				return c.json(data, 200);
			} catch (error) {
				if ((error as Error).message.includes("not found in schema")) {
					return c.json({ error: (error as Error).message }, 404);
				}
				return c.json({ error: (error as Error).message }, 500);
			}
		},
	);

	// This is the route with the error
	api.openapi(
		createRoute({
			method: "patch",
			path: "/singletons/:singleton",
			tags: ["Singletons"],
			summary: "Update a singleton",
			request: {
				params: SingletonParamSchema,
				body: {
					content: {
						"application/json": {
							schema: DocumentUpdateSchema,
						},
					},
				},
			},
			responses: {
				200: {
					description: "Updated singleton",
					content: {
						"application/json": {
							schema: DocumentSchema,
						},
					},
				},
				400: {
					description: "Invalid input",
					content: {
						"application/json": {
							schema: ErrorResponseSchema,
						},
					},
				},
				404: {
					description: "Singleton not found",
					content: {
						"application/json": {
							schema: ErrorResponseSchema,
						},
					},
				},
				500: {
					description: "Internal server error",
					content: {
						"application/json": {
							schema: ErrorResponseSchema,
						},
					},
				},
			},
		}),
		async (c: Context) => {
			try {
				const { singleton } = c.req.param();
				const data = await c.req.json();

				const result = await cms.updateSingleton(singleton, data);
				if (!result) {
					return c.json(
						{
							error: `Singleton '${singleton}' not found or could not be updated`,
						},
						404,
					);
				}
				return c.json(result, 200);
			} catch (error) {
				const err = error as Error;
				if (err.message.includes("not found in schema")) {
					return c.json({ error: err.message }, 404);
				}
				if (err.message.includes("validation")) {
					return c.json({ error: err.message }, 400);
				}
				return c.json({ error: err.message }, 500);
			}
		},
	);

	api.openapi(
		createRoute({
			method: "get",
			path: "/me",
			tags: ["Users"],
			summary: "Get the logged in users details",
			responses: {
				200: {
					description: "Document",
					content: {
						"application/json": {
							schema: DocumentSchema,
						},
					},
				},
				404: {
					description: "Collection or document not found",
					content: {
						"application/json": {
							schema: ErrorResponseSchema,
						},
					},
				},
				500: {
					description: "Internal server error",
					content: {
						"application/json": {
							schema: ErrorResponseSchema,
						},
					},
				},
			},
		}),
		async (c) => {
			try {
				const user = c.get("user");
				const document = await cms.auth.getUserById(user);

				if (!document) {
					return c.json({ error: "User not found" }, 404);
				}

				const response = {
					_id: document._id,
					_createdAt: document._createdAt,
					_updatedAt: document._updatedAt,
					...document,
				};

				return c.json(response, 200);
			} catch (error) {
				if ((error as Error).message.includes("not found in schema")) {
					return c.json({ error: (error as Error).message }, 404);
				}
				return c.json({ error: (error as Error).message }, 500);
			}
		},
	);

	api.doc("/doc", {
		openapi: "3.0.0",
		info: {
			title: "nullCMS REST API",
			version: "1.0.0",
			description: "API for the NullCMS headless content management system",
		},
		servers: [
			{
				url: "http://localhost:4000/api",
				description: "API server",
			},
		],
	});

	return api;
}
