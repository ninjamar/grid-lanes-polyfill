import { defineConfig } from '@playwright/test';


const HOST = process.env.HOST || "127.0.0.1";
const PORT = process.env.PORT || 3500;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: `http://${HOST}:${PORT}`,
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: `pnpm exec http-server . -a ${HOST} -p ${PORT}`,
    url: `http://${HOST}:${PORT}`,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
