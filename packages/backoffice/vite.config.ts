import path, { resolve } from "node:path";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig(({ command }) => {
	if (command === "serve") {
		// Testbed mode
		return {
			plugins: [
				TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
				react(),
			],
			resolve: {
				alias: {
					"@": path.resolve(__dirname, "./src"),
				},
			},
			server: {
				port: 4001,
			},
		};
	}
	// Production build mode (library)
	return {
		plugins: [
			react(),
			TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
			dts({ include: ["src"] }), // Generate TypeScript definitions
		],
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "./src"),
			},
		},
		build: {
			lib: {
				entry: resolve(__dirname, "src/index.ts"),
				name: "EmbeddableBackoffice",
				fileName: "index",
			},
			rollupOptions: {
				external: ["react", "react-dom", "@tanstack/react-router"],
				output: {
					globals: {
						react: "React",
						"react-dom": "ReactDOM",
						"@tanstack/react-router": "TanStackRouter",
					},
				},
			},
		},
	};
});
