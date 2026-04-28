/**
 * Environment-aware configuration.
 * Values are read from environment variables (set via .env.local or CI secrets).
 * Provides typed access and validates required variables at startup.
 */

export interface SalesforceConfig {
  instanceUrl: string;
  adminUsername: string;
  adminPassword: string;
  adminSecurityToken: string;
  platformUserUsername: string;
  platformUserPassword: string;
  apiVersion: string;
  orgAlias: string;
}

export interface TestConfig {
  accountName: string;
  opportunityName: string;
  closeDate: string;
  stageName: string;
  amount: string;
  quantity: string;
  description: string;
  leadSource: string;
  type: string;
  probability: string;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Required environment variable "${key}" is not set. ` +
        `Check your .env.local file or CI environment.`
    );
  }
  return value;
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

export function getSalesforceConfig(): SalesforceConfig {
  return {
    instanceUrl: requireEnv("SF_INSTANCE_URL"),
    adminUsername: requireEnv("SF_ADMIN_USERNAME"),
    adminPassword: requireEnv("SF_ADMIN_PASSWORD"),
    adminSecurityToken: optionalEnv("SF_SECURITY_TOKEN", ""),
    platformUserUsername: optionalEnv("SF_PLATFORM_USER_USERNAME", ""),
    platformUserPassword: optionalEnv("SF_PLATFORM_USER_PASSWORD", ""),
    apiVersion: optionalEnv("SF_API_VERSION", "59.0"),
    orgAlias: optionalEnv("SF_ORG_ALIAS", "sf-playwright-org"),
  };
}

export function getTestConfig(): TestConfig {
  return {
    accountName: optionalEnv("TEST_ACCOUNT_NAME", "A1"),
    opportunityName: optionalEnv(
      "TEST_OPPORTUNITY_NAME",
      "A1 Q1 2026 Opportunity"
    ),
    closeDate: optionalEnv("TEST_CLOSE_DATE", "12/31/2026"),
    stageName: optionalEnv("TEST_STAGE_NAME", "Prospecting"),
    amount: optionalEnv("TEST_AMOUNT", "50000"),
    quantity: optionalEnv("TEST_QUANTITY", "10"),
    description: optionalEnv(
      "TEST_DESCRIPTION",
      "Automated test opportunity created by Playwright framework."
    ),
    leadSource: optionalEnv("TEST_LEAD_SOURCE", "Web"),
    type: optionalEnv("TEST_TYPE", "New Business"),
    probability: optionalEnv("TEST_PROBABILITY", "20"),
  };
}