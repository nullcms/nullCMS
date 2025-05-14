import path, { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import * as fs from "node:fs/promises";

export default defineConfig(({ command }) => {
	if (command === "serve") {
		// Testbed mode
		return {
			plugins: [
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
			copyPlugin(),
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
			outDir: "dist-temp",
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
			watch: {
				include: ["src/**"],
				exclude: ["node_modules/**", "dist/**", "dist-temp/**"],
			},
		},
	};
});


const copyPlugin = () => {
	return {
		name: 'copy-dist',
		apply: 'build',
		writeBundle() {
			const srcPath = path.resolve(__dirname, "dist-temp")
			const destPath = path.resolve(__dirname, "dist");
			fs.cp(srcPath, destPath, { recursive: true })
				.then(() => console.log(`Copied build-dir to ${destPath}`))
				.catch(err => console.error(`Failed to copy build-dir: ${err}`));
		}
	};
};
