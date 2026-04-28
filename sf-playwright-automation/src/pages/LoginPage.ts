/**
 * LoginPage
 *
 * Handles Salesforce login flow including standard login, sandbox redirects,
 * and "Login as" user impersonation available to admins.
 */
import { Page, expect } from "@playwright/test";
import { BaseLightningPage } from "./BaseLightningPage";

export class LoginPage extends BaseLightningPage {
  private readonly usernameInput = "#username";
  private readonly passwordInput = "#password";
  private readonly loginButton = "#Login";
  private readonly errorMessage = "#error";

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto("/login.jsp", { waitUntil: "domcontentloaded" });
  }

  /**
   * Log in with provided credentials.
   * Handles Salesforce's multi-step login (MFA prompt is skipped in scratch orgs).
   */
  async login(username: string, password: string): Promise<void> {
    // Go to login page if not already there
    const currentUrl = this.page.url();
    if (!currentUrl.includes("/login") && !currentUrl.includes("salesforce.com")) {
      await this.page.goto("/login.jsp", { waitUntil: "domcontentloaded" });
    }

    // Fill credentials (wait briefly for inputs to be ready)
    await this.page.waitForSelector(this.usernameInput, { timeout: 3000 });
    // Small delay to further reduce race conditions before filling credentials
    await this.page.fill(this.usernameInput, username, { timeout: 3000 });
    await this.page.fill(this.passwordInput, password, { timeout: 3000 });
    await this.page.click(this.loginButton);

    // Wait for either the Lightning app or an error
    await Promise.race([
      this.page.waitForURL(/\/lightning\//, { timeout: 60_000 }),
      this.page.waitForSelector(this.errorMessage, { timeout: 60_000 }),
    ]);

    // Check for login errors
    const errorEl = this.page.locator(this.errorMessage);
    if (await errorEl.isVisible({ timeout: 2000 }).catch(() => false)) {
      const errorText = await errorEl.innerText();
      throw new Error(`Salesforce login failed: ${errorText}`);
    }

    await this.waitForLightningReady();
  }

  /**
   * Log in as a different user using the "Login As" feature (requires admin).
   * Navigates to the user record and uses the Login button.
   */
  async loginAsUser(userId: string): Promise<void> {
    await this.page.goto(`/lightning/setup/ManageUsers/page?address=/${userId}`, {
      waitUntil: "domcontentloaded",
    });

    await this.waitForLightningReady();

    // Click the "Login" button on the user detail page
    const loginButton = this.page.locator(
      'a:text-is("Login"), input[value="Login"]'
    ).first();

    await loginButton.click();
    await this.waitForLightningReady();
  }

  /**
   * Log out of Salesforce.
   */
  async logout(): Promise<void> {
    await this.page.goto("/secur/logout.jsp", { waitUntil: "domcontentloaded" });
        await this.page.waitForTimeout(3000);
    
  }

  async isLoggedIn(): Promise<boolean> {
    const url = this.page.url();
    return url.includes("/lightning/");
  }

  async assertLoggedIn(): Promise<void> {
    await expect(this.page).toHaveURL(/\/lightning\//, { timeout: 30_000 });
  }
}