const { defineConfig } = require('@playwright/test')
const httpdir = require('httpdir')

export default defineConfig({
  use: {
    baseURL: 'http://localhost:9698',
    headless: true,
    acceptDownloads: true,
  },
  testMatch: 'tests/*.spec.js',
  outputDir: 'dist/tests-results',
  webServer: {
    command: 'node_modules/.bin/httpdir dist 9698',
    url: 'http://localhost:9698',
    reuseExistingServer: true,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
