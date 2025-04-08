import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path, { resolve } from 'path';
import dts from 'vite-plugin-dts';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig(({ command }) => {
    if (command === 'serve') {
        // Testbed mode
        return {
            plugins: [
                TanStackRouterVite({ target: 'react', autoCodeSplitting: true }),
                react()
            ],
            resolve: {
                alias: {
                    "@": path.resolve(__dirname, "./src"),
                },
            },
            server: {
                port: 4001
            },
        };
    } else {
        // Production build mode (library)
        return {
            plugins: [
                react(),
                TanStackRouterVite({ target: 'react', autoCodeSplitting: true }),
                dts({ include: ['src'] }), // Generate TypeScript definitions
            ],
            resolve: {
                alias: {
                    "@": path.resolve(__dirname, "./src"),
                },
            },
            build: {
                lib: {
                    entry: resolve(__dirname, 'src/index.ts'),
                    name: 'EmbeddableBackoffice',
                    fileName: 'index',
                },
                rollupOptions: {
                    external: ['react', 'react-dom', '@tanstack/react-router'],
                    output: {
                        globals: {
                            react: 'React',
                            'react-dom': 'ReactDOM',
                            '@tanstack/react-router': 'TanStackRouter',
                        },
                    },
                },
            },
        };
    }
});
