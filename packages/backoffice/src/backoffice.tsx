import type React from "react";
import type { BackofficeConfig } from "./types/config";
import "./styles.css";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

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
import { ConfigProvider } from "./components/providers/config-provider";

const routeTree = RootRoute;
routeTree.addChildren([
  CollectionRoute,
  CollectionEditRoute,
  IndexRoute,
  SingletonEditRoute,
]);

export interface RouterContext {
	queryClient: typeof queryClient;
	config: BackofficeConfig;
}

// Create a new router instance with initial context
export const router = createRouter({ 
  routeTree, 
  context: {
    queryClient,
    config: {} as BackofficeConfig 
  } as RouterContext
});

export const NullBackoffice: React.FC<NullBackofficeProps> = ({ config }) => {
  return (
    <ConfigProvider config={config}>
      <ApiProvider baseURL={config.apiUrl}>
        <QueryClientProvider client={queryClient}>
          <ReactQueryDevtools initialIsOpen={false} />
          <AuthProvider>
            <RouterProvider 
              router={router} 
              basepath={config.basePath}
              context={{
                queryClient,
                config
              }}
            />
          </AuthProvider>
        </QueryClientProvider>
      </ApiProvider>
    </ConfigProvider>
  );
};