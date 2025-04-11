import type React from "react";
import type { BackofficeConfig } from "./types/config";
import "./styles.css";
import { RouterProvider, createRouter } from "@tanstack/react-router";

interface NullBackofficeProps {
	config: BackofficeConfig;
}

import { ApiProvider } from "@/components/providers/api-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { queryClient } from "@/lib/client";
import { IndexRoute } from "@/routes";
import { CollectionRoute } from "@/routes/-collection.$name";
import { CollectionEditRoute } from "@/routes/-collection.$name.$id";
import { RootRoute } from "@/routes/__root";
import { SingletonEditRoute } from "@/routes/singleton.$name";
import { QueryClientProvider } from "@tanstack/react-query";
// Import the generated route tree
import { ConfigProvider } from "./components/providers/config-provider";

const routeTree = RootRoute;
routeTree.addChildren([
	CollectionRoute,
	CollectionEditRoute,
	IndexRoute,
	SingletonEditRoute,
]);

// Create a new router instance
export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

export const NullBackoffice: React.FC<NullBackofficeProps> = ({ config }) => {
	return (
		<ConfigProvider config={config}>
			<ApiProvider baseURL={config.apiUrl}>
				<QueryClientProvider client={queryClient}>
					<AuthProvider>
						<RouterProvider router={router} basepath={config.basePath} />
					</AuthProvider>
				</QueryClientProvider>
			</ApiProvider>
		</ConfigProvider>
	);
};
