import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  use: {
    channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
    baseURL: "http://127.0.0.1:3000",
    headless: true,
    viewport: { width: 1440, height: 1000 },
  },
  workers: 1,
  reporter: "list",
  webServer: {
    command: "npm run dev",
    env: { NEXT_PUBLIC_WHATSAPP_ENABLED: "true" },
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
