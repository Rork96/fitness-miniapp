import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests",
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_WEB_SERVER_COMMAND
    ? {
        command: process.env.PLAYWRIGHT_WEB_SERVER_COMMAND,
        url: baseURL,
        timeout: 120 * 1000,
        reuseExistingServer: true,
      }
    : {
        command: "npm run dev",
        url: baseURL,
        timeout: 120 * 1000,
        reuseExistingServer: !process.env.CI,
      },
});
