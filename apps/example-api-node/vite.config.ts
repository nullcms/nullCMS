import { defineConfig } from 'vite'
import devServer from '@hono/vite-dev-server'
import react from '@vitejs/plugin-react'


export default defineConfig(({ mode }) => {
  if (mode === 'client') {
    return {
      build: {
        rollupOptions: {
          input: ['./src/backoffice/index.tsx'],
          output: {
            entryFileNames: 'client/index.js',
            chunkFileNames: 'client/assets/[name]-[hash].js',
            assetFileNames: 'client/assets/[name].[ext]',
          },
        },
        emptyOutDir: false,
        copyPublicDir: false,
      },
    }
  }
    return {
      build: {
        minify: true,
        rollupOptions: {
          output: {
            entryFileNames: '_worker.js',
          },
        },
      },
      plugins: [
        devServer({
          entry: './src/index.ts',
        }),
        react()
      ],
      ssr: {
        external: ['react', 'react-dom', 'process']
      },
    }
})