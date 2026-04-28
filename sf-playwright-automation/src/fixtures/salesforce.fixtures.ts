/**
 * Test Fixtures
 *
 * Extends Playwright's base fixtures to provide typed page objects,
 * API client, and shared test state (record IDs) across tests.
 *
 * Fixtures handle setup/teardown and ensure tests are isolated where possible.
 */
import { test as base, expect } from "@playwright/test";
import { LoginPage } from "@pages/LoginPage";
import { AccountPage } from "@pages/AccountPage";
import { OpportunityPage } from "@pages/OpportunityPage";
import { UserManagementPage } from "@pages/UserManagement";
import { SalesforceApiClient } from "@utils/SalesforceApiClient";
import { getSalesforceConfig, getTestConfig } from "@config/environment";

// Shared state passed between test files via process.env (poor man's state store)
// In production frameworks this would use a file-based or DB state store.
export const SharedState = {
  opportunityId: process.env.SHARED_OPPORTUNITY_ID ?? "",
  accountId: process.env.SHARED_ACCOUNT_ID ?? "",
  platformUserId: process.env.SHARED_PLATFORM_USER_ID ?? "",
  platformUserUsername: process.env.SHARED_PLATFORM_USER_USERNAME ?? "",
  platformUserPassword: process.env.SHARED_PLATFORM_USER_PASSWORD ?? "",

  setOpportunityId(id: string): void {
    this.opportunityId = id;
    process.env.SHARED_OPPORTUNITY_ID = id;
  },
  setAccountId(id: string): void {
    this.accountId = id;
    process.env.SHARED_ACCOUNT_ID = id;
  },
  setPlatformUser(id: string, username: string, password: string): void {
    this.platformUserId = id;
    this.platformUserUsername = username;
    this.platformUserPassword = password;
    process.env.SHARED_PLATFORM_USER_ID = id;
    process.env.SHARED_PLATFORM_USER_USERNAME = username;
    process.env.SHARED_PLATFORM_USER_PASSWORD = password;
  },
};

// Define custom fixture types
type SalesforceFixtures = {
  loginPage: LoginPage;
  accountPage: AccountPage;
  opportunityPage: OpportunityPage;
  userManagementPage: UserManagementPage;
  apiClient: SalesforceApiClient;
  sfConfig: ReturnType<typeof getSalesforceConfig>;
  testConfig: ReturnType<typeof getTestConfig>;
  authenticatedPage: void;
};

export const test = base.extend<SalesforceFixtures>({
  // Configuration fixtures
  sfConfig: async ({}, use) => {
    await use(getSalesforceConfig());
  },

  testConfig: async ({}, use) => {
    await use(getTestConfig());
  },

  // API client fixture — authenticated and ready
  apiClient: async ({ sfConfig }, use) => {
    const client = new SalesforceApiClient(sfConfig.instanceUrl, sfConfig.apiVersion);
    try {
      await client.authenticate(
        sfConfig.adminUsername,
        sfConfig.adminPassword,
        sfConfig.adminSecurityToken
      );
    } catch (error) {
      console.warn(
        "API client auth failed — API-based operations will be unavailable:",
        error
      );
    }
    await use(client);
  },

  // Page object fixtures
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  accountPage: async ({ page }, use) => {
    await use(new AccountPage(page));
  },

  opportunityPage: async ({ page }, use) => {
    await use(new OpportunityPage(page));
  },

  userManagementPage: async ({ page }, use) => {
    await use(new UserManagementPage(page));
  },

  // Ensure the page is authenticated before each test
  authenticatedPage: [
    async ({ page, sfConfig }, use) => {
      // Navigate to a Lightning page to check if authenticated
      try {
        await page.goto("/lightning/page/home", { 
          waitUntil: "domcontentloaded",
          timeout: 10000 
        });
        
        // If we're redirected to login, authenticate
        const currentUrl = page.url();
        if (currentUrl.includes("/login")) {
          const loginPage = new LoginPage(page);
          await loginPage.login(sfConfig.adminUsername, sfConfig.adminPassword);
        }
      } catch (error) {
        // If navigation fails, try to login
        const loginPage = new LoginPage(page);
        await loginPage.login(sfConfig.adminUsername, sfConfig.adminPassword);
      }
      
      await use();
    },
    { auto: true }, // Run for every test automatically
  ],
});

export { expect };