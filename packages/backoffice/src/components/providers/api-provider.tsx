import axios from "axios";
import type React from "react";
import { createContext, useContext } from "react";

type ApiContextType = {
	baseURL: string;
	apiClient: ReturnType<typeof createApiClient>;
};

// Export this function so it can be used in the API client file
export const createApiClient = (baseURL: string) => {
	const client = axios.create({
		baseURL,
		headers: {
			"Content-Type": "application/json",
		},
		withCredentials: true,
	});

	client.interceptors.response.use(
		(response) => response,
		(error) => {
			if (error.response?.status === 401) {
				window.dispatchEvent(new CustomEvent("auth:unauthenticated"));
			}
			return Promise.reject(error);
		},
	);

	return client;
};

// We need a default context value for React's createContext
const ApiContext = createContext<ApiContextType | null>(null);

// Make baseURL required
export const ApiProvider: React.FC<{
	children: React.ReactNode;
	baseURL: string;
}> = ({ children, baseURL }) => {
	if (!baseURL) {
		throw new Error("ApiProvider requires a baseURL prop");
	}

	// Create the API client with the provided baseURL
	const apiClient = createApiClient(baseURL);

	return (
		<ApiContext.Provider
			value={{
				baseURL,
				apiClient,
			}}
		>
			{children}
		</ApiContext.Provider>
	);
};

// Update the hook to throw an error if used outside of a provider
export const useApi = () => {
	const context = useContext(ApiContext);

	if (context === null) {
		throw new Error("useApi must be used within an ApiProvider");
	}

	return context;
};
