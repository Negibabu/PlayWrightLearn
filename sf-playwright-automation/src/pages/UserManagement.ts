/**
 * UserManagementPage
 *
 * Page Object for Salesforce User management in Lightning Experience.
 * Handles creating Platform Users and managing their permission sets.
 */
import { Page, expect, Frame } from "@playwright/test";
import { BaseLightningPage } from "./BaseLightningPage";

export interface NewUserData {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  alias: string;
  profileName: string;
  roleRequired?: boolean;
}

export class UserManagementPage extends BaseLightningPage {
  constructor(page: Page) {
    super(page);
  }

  // ─── Navigation ────────────────────────────────────────────────────────────

  async navigateToUserList(): Promise<void> {
    await this.navigateTo("/lightning/setup/ManageUsers/home");
    await this.waitForLightningReady();
  }

  async navigateToNewUserForm(): Promise<void> {
    // New User form is in Classic Setup embedded in Lightning
    await this.page.goto(
      "/lightning/setup/ManageUsers/page?address=/005/e",
      { waitUntil: "domcontentloaded" }
    );
    await this.waitForLightningReady();
  }

  // ─── Create User ───────────────────────────────────────────────────────────

  /**
   * Create a new Standard Platform User.
   * Returns the new User's ID.
   *
   * NOTE: Salesforce's New User form is a Classic Visualforce page embedded
   * in Lightning via an iframe. We interact with the iframe content directly.
   */
  async createPlatformUser(userData: NewUserData): Promise<string> {
    await this.navigateToNewUserForm();

    // New User is rendered in a Visualforce iframe inside Lightning
    const frame = await this.getSetupIframe();

    // Fill user details in the Classic form
    await frame.fill('input[name="name_firstName"]', userData.firstName);
    await frame.fill('input[name="name_lastName"]', userData.lastName);
    await frame.fill('input[name="Email"]', userData.email);
    await frame.fill('input[name="Username"]', userData.username);
    await frame.fill('input[name="CommunityNickname"]', userData.alias);

    // Set Profile via select
    await frame.selectOption('select[name="Profile"]', {
      label: userData.profileName,
    });

    // Set Time Zone (required field)
    await frame
      .locator('select[name="TimeZoneSidKey"]')
      .selectOption({ value: "America/New_York" });

    // Set Locale
    await frame
      .locator('select[name="LocaleSidKey"]')
      .selectOption({ value: "en_US" });

    // Set Language
    await frame
      .locator('select[name="LanguageLocaleKey"]')
      .selectOption({ value: "en_US" });

    // Set Email Encoding
    await frame
      .locator('select[name="EmailEncodingKey"]')
      .selectOption({ value: "UTF-8" });

    // Save
    await frame.click('input[value="Save"]');
    await this.waitForLightningReady();

    // Extract user ID from the URL after redirect
    const url = this.page.url();
    const match = url.match(/\/([a-zA-Z0-9]{15,18})\b/);
    if (match) return match[1];

    throw new Error("Could not determine new user ID after creation");
  }

  /**
   * Reset a user's password so they can log in immediately (avoids email flow).
   */
  async resetUserPassword(userId: string, newPassword: string): Promise<void> {
    await this.page.goto(
      `/lightning/setup/ManageUsers/page?address=/${userId}/e`,
      { waitUntil: "domcontentloaded" }
    );
    await this.waitForLightningReady();

    const frame = await this.getSetupIframe();

    // Look for the "Change Password" section
    const newPassInput = frame.locator('input[name="newpassword"]');
    const confirmPassInput = frame.locator('input[name="confirmpassword"]');

    if (await newPassInput.isVisible({ timeout: 5000 })) {
      await newPassInput.fill(newPassword);
      await confirmPassInput.fill(newPassword);
      await frame.click('input[value="Save"]');
      await this.waitForLightningReady();
    }
  }

  /**
   * Find a user by username. Returns user ID or null.
   */
  async findUserByUsername(username: string): Promise<string | null> {
    try {
      await this.navigateToUserList();

      // Search for the user in the list
      const searchInput = this.page.locator(
        'input[name="searchValue"], #searchUsersForm input[type="search"]'
      ).first();

      if (await searchInput.isVisible({ timeout: 5000 })) {
        await searchInput.fill(username);
        await this.page.keyboard.press("Enter");
        await this.waitForLightningReady();
      }

      const userLink = this.page
        .locator(`a:text-is("${username.split("@")[0]}")`)
        .first();

      if (await userLink.isVisible({ timeout: 5000 })) {
        await userLink.click();
        await this.waitForLightningReady();
        return this.getCurrentRecordId();
      }

      return null;
    } catch {
      return null;
    }
  }

  // ─── Permission Sets ───────────────────────────────────────────────────────

  /**
   * Assign a permission set to a user by navigating to the user record.
   */
  async assignPermissionSet(
    userId: string,
    permissionSetName: string
  ): Promise<void> {
    // Navigate to the user's permission set assignments
    await this.page.goto(
      `/lightning/setup/ManageUsers/page?address=/${userId}?noredirect=1`,
      { waitUntil: "domcontentloaded" }
    );
    await this.waitForLightningReady();

    const frame = await this.getSetupIframe();

    // Find "Permission Set Assignments" related list and click Edit
    const editPermLink = frame
      .locator('a[title="Edit Assignments"], a:text-is("Edit Assignments")')
      .first();

    await editPermLink.click();
    await this.waitForLightningReady();

    const newFrame = await this.getSetupIframe();

    // Add the permission set
    const availableList = newFrame.locator('select[name="duel_select_0"]');
    await availableList.selectOption({ label: permissionSetName });

    // Click "Add" arrow button
    await newFrame.locator('a[id*="add_button"]').first().click();

    // Save
    await newFrame.locator('input[value="Save"]').click();
    await this.waitForLightningReady();

    console.log(
      `✅ Permission set "${permissionSetName}" assigned to user ${userId}`
    );
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  /**
   * Get the Setup iframe context. Salesforce Setup pages render content
   * inside an iframe with id="setupComponent" in Lightning Experience.
   */
  private async getSetupIframe(): Promise<Frame> {
    // Wait for the iframe to load
    const iframeSelector = [
      'iframe[name="setupComponent"]',
      '.setupcontent iframe',
      'iframe.setupComponent',
      "iframe",
    ];

    for (const selector of iframeSelector) {
      const iframeEl = this.page.locator(selector).first();
      if (await iframeEl.isVisible({ timeout: 5000 })) {
        const frameHandle = await iframeEl.contentFrame();
        if (frameHandle) return frameHandle as unknown as Frame;
      }
    }
 
    // If no iframe, we might be on a non-framed setup page
    return this.page.mainFrame() as unknown as Frame;
  }
}