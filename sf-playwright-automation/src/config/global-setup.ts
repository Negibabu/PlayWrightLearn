/**
 * Global setup runs once before all tests.
 * Creates the playwright/.auth directory for session storage.
 */
import * as fs from "fs";
import * as path from "path";

async function globalSetup(): Promise<void> {
  // Ensure auth directory exists for storageState persistence
  const authDir = path.join(process.cwd(), "playwright", ".auth");
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Ensure test-results directory exists
  const resultsDir = path.join(process.cwd(), "test-results");
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  console.log("✅ Global setup complete");
}

export default globalSetup;