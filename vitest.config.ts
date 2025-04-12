import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [],
  test: {
    exclude:[
      ...configDefaults.exclude, 
      'tests/web/*'
    ],
    reporters: ['junit'],
    outputFile: {
      junit: './test-output/junit.xml',
    }
  }
});
