import { useApi } from "@/components/providers/api-provider";
import type { Document } from "@nullcms/shared";
import {
	QueryClient,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AxiosError, type AxiosInstance } from "axios";
import { toast } from "sonner";

// Create a client
export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5, // 5 minutes
			retry: 2,
			refetchOnWindowFocus: false,
		},
	},
});

// Error handling helper
export type ApiError = {
	message: string;
	status: number;
	data?: object;
};

const handleApiError = (error: unknown): ApiError => {
	if (error instanceof AxiosError) {
		return {
			message: error.response?.data?.error || error.message,
			status: error.response?.status || 500,
			data: error.response?.data,
		};
	}
	return {
		message: "Unknown error occurred",
		status: 500,
	};
};

// Types
export type CollectionOptions = {
	skip?: number;
	limit?: number;
};

// API functions factory that uses the apiClient from context
export const createApi = (apiClient: AxiosInstance) => ({
	// Collection operations
	collections: {
		getAll: async () => {
			const response = await apiClient.get("/collections");
			return response.data.collections;
		},
		getSchema: async (collection: string) => {
			const response = await apiClient.get(
				`/api/collections/${collection}/schema`,
			);
			return response.data.schema;
		},
	},

	// Document operations
	documents: {
		getAll: async <T extends Document>(
			collection: string,
			options?: CollectionOptions,
		) => {
			const params = new URLSearchParams();
			if (options?.skip !== undefined)
				params.append("skip", options.skip.toString());
			if (options?.limit !== undefined)
				params.append("limit", options.limit.toString());

			const response = await apiClient.get(
				`/api/collections/${collection}/documents`,
				{ params },
			);
			return response.data.documents as T[];
		},
		getById: async <T extends Document>(collection: string, id: string) => {
			const response = await apiClient.get(
				`/api/collections/${collection}/documents/${id}`,
			);
			return response.data as T;
		},
		create: async <T extends Document>(
			collection: string,
			data: Omit<T, "_id">,
		) => {
			const response = await apiClient.post(
				`/api/collections/${collection}/documents`,
				data,
			);
			return response.data as T;
		},
		update: async <T extends Document>(
			collection: string,
			id: string,
			data: Partial<Omit<T, "_id" | "_createdAt" | "_updatedAt">>,
		) => {
			const response = await apiClient.patch(
				`/api/collections/${collection}/documents/${id}`,
				data,
			);
			return response.data as T;
		},
		delete: async (collection: string, id: string) => {
			const response = await apiClient.delete(
				`/api/collections/${collection}/documents/${id}`,
			);
			return response.data.success;
		},
	},

	// Singleton operations
	singletons: {
		getAll: async () => {
			const response = await apiClient.get("/api/singletons");
			return response.data.singletons;
		},
		getSchema: async (singleton: string) => {
			const response = await apiClient.get(
				`/api/singletons/${singleton}/schema`,
			);
			return response.data.schema;
		},
		getById: async <T extends Document>(singleton: string) => {
			const response = await apiClient.get(`/api/singletons/${singleton}`);
			return response.data as T;
		},
		update: async <T extends Document>(
			singleton: string,
			data: Partial<Omit<T, "_id" | "_createdAt" | "_updatedAt">>,
		) => {
			const response = await apiClient.patch(
				`/api/singletons/${singleton}`,
				data,
			);
			return response.data as T;
		},
	},
});

// Collection hooks
export function useCollections() {
	const { apiClient, baseURL } = useApi();
	const api = createApi(apiClient);

	return useQuery({
		queryKey: ["collections", baseURL],
		queryFn: () => api.collections.getAll(),
	});
}

export function useCollectionSchema(collection: string) {
	const { apiClient, baseURL } = useApi();
	const api = createApi(apiClient);

	return useQuery({
		queryKey: ["collections", baseURL, collection, "schema"],
		queryFn: () => api.collections.getSchema(collection),
		enabled: !!collection,
	});
}

// Document hooks
export function useDocuments<T extends Document>(
	collection: string,
	options?: CollectionOptions,
) {
	const { apiClient, baseURL } = useApi();
	const api = createApi(apiClient);

	return useQuery({
		queryKey: ["collections", baseURL, collection, "documents", options],
		queryFn: () => api.documents.getAll<T>(collection, options),
		enabled: !!collection,
	});
}

export function useDocument<T extends Document>(
	collection: string,
	id: string | undefined,
) {
	const { apiClient, baseURL } = useApi();
	const api = createApi(apiClient);

	return useQuery({
		queryKey: ["collections", baseURL, collection, "documents", id],
		queryFn: () => api.documents.getById<T>(collection, id as string),
		enabled: !!collection && !!id,
	});
}

export function useCreateDocument<T extends Document>(collection?: string) {
	const queryClient = useQueryClient();
	const navigate = useNavigate({ from: "/collection/$name/$id" });
	const { apiClient } = useApi();
	const api = createApi(apiClient);

	return useMutation({
		mutationFn: (data: Omit<T, "_id">) => {
			if (!collection) throw new Error("Collection is required");
			return api.documents.create<T>(collection, data);
		},
		onSuccess: async (e) => {
			toast("Document Created", {
				description: "Document has been created",
			});
			await queryClient.invalidateQueries({
				queryKey: ["collections", collection, "documents"],
			});
			await navigate({
				to: "/collection/$name/$id",
				params: { name: collection, id: e._id },
			});
		},
		onError: (error) => {
			toast("Document Failed to Create", {
				description: "Document has failed to create",
			});
			return handleApiError(error);
		},
	});
}

export function useUpdateDocument<T extends Document>(collection?: string) {
	const queryClient = useQueryClient();
	const { apiClient } = useApi();
	const api = createApi(apiClient);

	return useMutation({
		mutationFn: ({
			id,
			data,
		}: {
			id: string;
			data: Partial<Omit<T, "_id" | "_createdAt" | "_updatedAt">>;
		}) => {
			if (!collection) throw new Error("Collection is required");
			return api.documents.update<T>(collection, id, data);
		},
		onSuccess: async (_, variables) => {
			await queryClient.invalidateQueries({
				queryKey: ["collections", collection, "documents", variables.id],
			});
			await queryClient.invalidateQueries({
				queryKey: ["collections", collection, "documents"],
			});
			toast("Document Saved", {
				description: "Document has been updated",
			});
		},
		onError: (error) => {
			toast("Failed to save document", {
				description: "Failed to save document",
			});
			return handleApiError(error);
		},
	});
}

export function useDeleteDocument(collection?: string) {
	const queryClient = useQueryClient();
	const navigate = useNavigate({ from: "/collection/$name/$id" });
	const { apiClient } = useApi();
	const api = createApi(apiClient);

	return useMutation({
		mutationFn: (id: string) => {
			if (!collection) throw new Error("Collection is required");
			return api.documents.delete(collection, id);
		},
		onSuccess: async (_, id) => {
			toast("Document deleted", {
				description: "Document successfully deleted",
			});
			await navigate({ to: "/collection/$name", params: { name: collection } });
			await queryClient.invalidateQueries({
				queryKey: ["collections", collection, "documents"],
			});
			await queryClient.invalidateQueries({
				queryKey: ["collections", collection, "documents", id],
			});
		},
		onError: (error) => {
			toast("Failed to delete document", {
				description: "Failed to delete document",
			});
			return handleApiError(error);
		},
	});
}

// Singleton hooks
export function useSingletons() {
	const { apiClient, baseURL } = useApi();
	const api = createApi(apiClient);

	return useQuery({
		queryKey: ["singletons", baseURL],
		queryFn: () => api.singletons.getAll(),
	});
}

export function useSingletonSchema(singleton: string) {
	const { apiClient, baseURL } = useApi();
	const api = createApi(apiClient);

	return useQuery({
		queryKey: ["singletons", baseURL, singleton, "schema"],
		queryFn: () => api.singletons.getSchema(singleton),
		enabled: !!singleton,
	});
}

export function useSingleton<T extends Document>(singleton: string) {
	const { apiClient } = useApi();
	const api = createApi(apiClient);

	return useQuery({
		queryKey: ["singletons", singleton],
		queryFn: () => api.singletons.getById<T>(singleton),
		enabled: !!singleton,
	});
}

export function useUpdateSingleton<T extends Document>(singleton: string) {
	const queryClient = useQueryClient();
	const { apiClient } = useApi();
	const api = createApi(apiClient);

	return useMutation({
		mutationFn: (data: Partial<Omit<T, "_id" | "_createdAt" | "_updatedAt">>) =>
			api.singletons.update<T>(singleton, data),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["singletons", singleton],
			});
			toast("Document Saved", {
				description: "Document has been updated",
			});
		},
		onError: (error) => {
			toast("Failed to save document", {
				description: "Failed to save document",
			});
			return handleApiError(error);
		},
	});
}
