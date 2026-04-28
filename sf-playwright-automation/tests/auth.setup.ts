/**
 * Authentication Setup
 *
 * This special "setup" test runs before the main tests.
 * It logs in as admin, saves the authenticated session state to disk,
 * so subsequent tests don't need to re-authenticate.
 *
 * This is the Playwright-recommended approach for handling authentication.
 */
import { test as setup, expect } from "@playwright/test";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const authFile = path.join(process.cwd(), "playwright", ".auth", "admin.json");

setup("authenticate as admin", async ({ page }) => {
  const instanceUrl = process.env.SF_INSTANCE_URL!;
  const username = process.env.SF_ADMIN_USERNAME!;
  const password = process.env.SF_ADMIN_PASSWORD!;

  if (!instanceUrl || !username || !password) {
    throw new Error(
      "Missing required environment variables: SF_INSTANCE_URL, SF_ADMIN_USERNAME, SF_ADMIN_PASSWORD"
    );
  }

  // Navigate to login page
  await page.goto(`${instanceUrl}/login.jsp`, { waitUntil: "domcontentloaded" });

  // Fill login form
  await page.fill("#username", username);
  await page.fill("#password", password);
  await page.click("#Login");

  // Wait for Lightning to load
  await page.waitForURL(/\/lightning\//, { timeout: 60_000 });

  // Wait for the app to fully initialize
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2000); // Allow LWC framework to boot

  // Verify we're logged in
  await expect(page).toHaveURL(/\/lightning\//);

  // Save authenticated session state
  await page.context().storageState({ path: authFile });
  console.log("✅ Admin authentication state saved");
});