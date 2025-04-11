/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file was automatically generated by TanStack Router.
// You should NOT make any changes in this file as it will be overwritten.
// Additionally, you should also exclude this file from your linter and/or formatter to prevent it from being checked or modified.

// Import Routes

import { Route as rootRoute } from "./routes/__root";
import { Route as IndexImport } from "./routes/index";
import { Route as SingletonNameImport } from "./routes/singleton.$name";

// Create/Update Routes

const IndexRoute = IndexImport.update({
	id: "/",
	path: "/",
	getParentRoute: () => rootRoute,
} as any);

const SingletonNameRoute = SingletonNameImport.update({
	id: "/singleton/$name",
	path: "/singleton/$name",
	getParentRoute: () => rootRoute,
} as any);

// Populate the FileRoutesByPath interface

declare module "@tanstack/react-router" {
	interface FileRoutesByPath {
		"/": {
			id: "/";
			path: "/";
			fullPath: "/";
			preLoaderRoute: typeof IndexImport;
			parentRoute: typeof rootRoute;
		};
		"/singleton/$name": {
			id: "/singleton/$name";
			path: "/singleton/$name";
			fullPath: "/singleton/$name";
			preLoaderRoute: typeof SingletonNameImport;
			parentRoute: typeof rootRoute;
		};
	}
}

// Create and export the route tree

export interface FileRoutesByFullPath {
	"/": typeof IndexRoute;
	"/singleton/$name": typeof SingletonNameRoute;
}

export interface FileRoutesByTo {
	"/": typeof IndexRoute;
	"/singleton/$name": typeof SingletonNameRoute;
}

export interface FileRoutesById {
	__root__: typeof rootRoute;
	"/": typeof IndexRoute;
	"/singleton/$name": typeof SingletonNameRoute;
}

export interface FileRouteTypes {
	fileRoutesByFullPath: FileRoutesByFullPath;
	fullPaths: "/" | "/singleton/$name";
	fileRoutesByTo: FileRoutesByTo;
	to: "/" | "/singleton/$name";
	id: "__root__" | "/" | "/singleton/$name";
	fileRoutesById: FileRoutesById;
}

export interface RootRouteChildren {
	IndexRoute: typeof IndexRoute;
	SingletonNameRoute: typeof SingletonNameRoute;
}

const rootRouteChildren: RootRouteChildren = {
	IndexRoute: IndexRoute,
	SingletonNameRoute: SingletonNameRoute,
};

export const routeTree = rootRoute
	._addFileChildren(rootRouteChildren)
	._addFileTypes<FileRouteTypes>();

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/",
        "/singleton/$name"
      ]
    },
    "/": {
      "filePath": "index.tsx"
    },
    "/singleton/$name": {
      "filePath": "singleton.$name.tsx"
    }
  }
}
ROUTE_MANIFEST_END */
