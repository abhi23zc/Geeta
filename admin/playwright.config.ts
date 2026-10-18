import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: '*.spec.ts', workers: 1,
  use: { baseURL: 'http://127.0.0.1:5178', viewport: { width: 1360, height: 1000 }, launchOptions: { ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : existsSync('/usr/bin/google-chrome') ? { executablePath: '/usr/bin/google-chrome' } : {}) } },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5178 --strictPort', url: 'http://127.0.0.1:5178/tests/music-fixture.html', reuseExistingServer: false },
});
