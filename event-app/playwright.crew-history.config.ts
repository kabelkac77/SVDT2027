import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "crew-history.spec.ts",
  workers: 1,
  reporter: "list",
  use: {
    channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
    baseURL: "http://127.0.0.1:4328",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  webServer: {
    command: "node_modules/.bin/next dev --hostname 127.0.0.1 --port 4328",
    env: {
      NEXT_PUBLIC_WHATSAPP_ENABLED: "false",
      NEXT_PUBLIC_SUPABASE_URL: "https://svdt-test.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_fixture",
      NEXT_TELEMETRY_DISABLED: "1",
    },
    url: "http://127.0.0.1:4328",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
