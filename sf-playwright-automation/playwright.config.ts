import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

export default defineConfig({
  testDir: "./tests",
  timeout: 120_000,
  expect: {
    timeout: 30_000,
  },
  fullyParallel: false, // Salesforce tests are stateful; run serially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Single worker to avoid org state collisions
  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["list"],
    ["json", { outputFile: "test-results/results.json" }],
  ],
  use: {
    baseURL: process.env.SF_INSTANCE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    // Ignore HTTPS errors for scratch orgs which use self-signed certs
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: "salesforce-chrome",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        // Persist auth state across tests in the same run
        storageState: "playwright/.auth/admin.json",
      },
      testMatch: /.*\.spec\.ts/,
      dependencies: ["setup"],
    },
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
  ],
  outputDir: "test-results/",
  globalSetup: "./src/config/global-setup.ts",
  globalTeardown: "./src/config/global-teardown.ts",
});
