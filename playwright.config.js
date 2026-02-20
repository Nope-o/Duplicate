import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:4173',
    headless: true,
    viewport: { width: 1280, height: 720 }
  },
  webServer: {
    command: 'npm run preview -- --host --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
});
