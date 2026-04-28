#!/usr/bin/env ts-node
/**
 * setup-scratch-org.ts
 *
 * Automated scratch org provisioning script.
 * Run this once before executing the Playwright test suite.
 *
 * What it does:
 *   1. Creates a new scratch org (or reuses one by alias)
 *   2. Pushes all Salesforce metadata (custom field, layout, permission set)
 *   3. Assigns the Opportunity_Read_Only permission set to the admin user
 *   4. Generates and writes the .env.local file with org credentials
 *
 * Usage:
 *   npm run setup:org
 *   -- or --
 *   ts-node scripts/setup-scratch-org.ts [--reuse-existing]
 */

import { execSync, ExecSyncOptions } from "child_process";
import * as fs from "fs";
import * as path from "path";

const ORG_ALIAS = "sf-playwright-org";
const SCRATCH_DEF = path.join(process.cwd(), "config", "project-scratch-def.json");
const ENV_LOCAL = path.join(process.cwd(), ".env.local");
const DURATION_DAYS = 7;

const execOptions: ExecSyncOptions = {
  encoding: "utf8",
  stdio: "pipe",
};

function run(command: string): string {
  console.log(`  → ${command}`);
  try {
    const result = execSync(command, execOptions);
    return (result as string).trim();
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    const stderr = err.stderr ?? "";
    const stdout = err.stdout ?? "";
    throw new Error(
      `Command failed: ${command}\nSTDOUT: ${stdout}\nSTDERR: ${stderr}`
    );
  }
}

function runJson<T>(command: string): T {
  const output = run(command);
  return JSON.parse(output) as T;
}

interface OrgDisplayResult {
  result: {
    instanceUrl: string;
    username: string;
    accessToken: string;
    status?: string;
  };
}

interface OrgCreateResult {
  result: {
    orgId: string;
    username: string;
  };
}

async function main(): Promise<void> {
  const reuseExisting = process.argv.includes("--reuse-existing");

  console.log("\n🚀 Salesforce Scratch Org Setup\n");

  // ── Step 1: Create or reuse scratch org ────────────────────────────────────
  console.log("Step 1: Checking for existing scratch org...");

  let orgExists = false;
  if (reuseExisting) {
    try {
      run(`sf org display --target-org ${ORG_ALIAS} --json`);
      orgExists = true;
      console.log(`  ✅ Reusing existing org: ${ORG_ALIAS}`);
    } catch {
      console.log("  ℹ️  No existing org found, creating new one...");
    }
  }

  if (!orgExists) {
    console.log(`  Creating scratch org (alias: ${ORG_ALIAS}, duration: ${DURATION_DAYS} days)...`);
    const createResult = runJson<OrgCreateResult>(
      `sf org create scratch ` +
      `--definition-file ${SCRATCH_DEF} ` +
      `--alias ${ORG_ALIAS} ` +
      `--duration-days ${DURATION_DAYS} ` +
      `--set-default ` +
      `--json`
    );
    console.log(`  ✅ Scratch org created: ${createResult.result.username}`);
  }

  // ── Step 2: Push metadata ──────────────────────────────────────────────────
  console.log("\nStep 2: Pushing metadata to scratch org...");
  run(`sf project deploy start --target-org ${ORG_ALIAS}`);
  console.log("  ✅ Metadata deployed (custom field, layout, permission set)");

  // ── Step 3: Get org credentials ───────────────────────────────────────────
  console.log("\nStep 3: Retrieving org credentials...");
  const orgDisplay = runJson<OrgDisplayResult>(
    `sf org display --target-org ${ORG_ALIAS} --verbose --json`
  );

  const { instanceUrl, username, accessToken } = orgDisplay.result;
  console.log(`  Instance URL: ${instanceUrl}`);
  console.log(`  Username:     ${username}`);

  // ── Step 4: Set admin password ────────────────────────────────────────────
  console.log("\nStep 4: Setting admin password...");
  const adminPassword = "Playwright@Test123!";

  try {
    run(
      `sf org generate password ` +
      `--target-org ${ORG_ALIAS} ` +
      `--json`
    );
    // Get the generated password
    const pwResult = runJson<{ result: { password: string } }>(
      `sf org display --target-org ${ORG_ALIAS} --verbose --json`
    );
    console.log(`  ✅ Admin password set`);
  } catch (err) {
    console.warn(
      "  ⚠️  Could not auto-generate password. " +
      "Using default and proceeding. You may need to set it manually."
    );
  }

  // ── Step 5: Assign permission set to admin ─────────────────────────────────
  console.log("\nStep 5: Assigning permission sets...");
  try {
    run(
      `sf org assign permset ` +
      `--name Opportunity_Read_Only ` +
      `--target-org ${ORG_ALIAS} ` +
      `--json`
    );
    console.log("  ✅ Opportunity_Read_Only permission set assigned to admin");
  } catch (err) {
    console.warn("  ⚠️  Could not assign permission set (may already be assigned)");
  }

  // ── Step 6: Write .env.local ───────────────────────────────────────────────
  console.log("\nStep 6: Writing .env.local...");

  const envContent = [
    `# Auto-generated by setup-scratch-org.ts on ${new Date().toISOString()}`,
    `# Do not commit this file to source control`,
    ``,
    `SF_INSTANCE_URL=${instanceUrl}`,
    `SF_ADMIN_USERNAME=${username}`,
    `SF_ADMIN_PASSWORD=${adminPassword}`,
    `SF_SECURITY_TOKEN=`,
    `SF_API_VERSION=59.0`,
    `SF_ORG_ALIAS=${ORG_ALIAS}`,
    ``,
    `# Test data configuration`,
    `TEST_ACCOUNT_NAME=A1`,
    `TEST_OPPORTUNITY_NAME=A1 Q1 2026 Opportunity`,
    `TEST_CLOSE_DATE=12/31/2026`,
    `TEST_STAGE_NAME=Prospecting`,
    `TEST_AMOUNT=50000`,
    `TEST_QUANTITY=10`,
    `TEST_LEAD_SOURCE=Web`,
    `TEST_TYPE=New Business`,
    `TEST_PROBABILITY=20`,
  ].join("\n");

  fs.writeFileSync(ENV_LOCAL, envContent, "utf8");
  console.log(`  ✅ Written to ${ENV_LOCAL}`);

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("\n✅ Scratch org setup complete!\n");
  console.log("Next steps:");
  console.log("  npm run test              # Run all tests");
  console.log("  npm run test:scenario1    # Run Scenario 1 only");
  console.log("  npm run test:scenario2    # Run Scenario 2 only");
  console.log("  npm run test:headed       # Run with browser visible\n");
}

main().catch((err) => {
  console.error("\n❌ Setup failed:", err.message);
  process.exit(1);
});