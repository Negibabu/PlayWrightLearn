/**
 * BaseLightningPage
 *
 * All page objects extend this class. It encapsulates Salesforce Lightning-specific
 * behaviours: waiting for spinners, handling toast notifications, LWC rendering delays,
 * and the Lightning Navigation Service URL patterns.
 */
import { Page, Locator, expect } from "@playwright/test";

export abstract class BaseLightningPage {
  protected page: Page;

  // Salesforce Lightning loading indicators
  private readonly SPINNER_SELECTORS = [
    ".slds-spinner_container",
    "lightning-spinner",
    ".slds-spinner",
    '[data-key="spinner"]',
    ".forcePageBlockSectionRow .slds-is-loading",
  ];

  constructor(page: Page) {
    this.page = page;
  }

  // ─── Navigation ────────────────────────────────────────────────────────────

  /**
   * Navigate to a Salesforce Lightning URL and wait for the page to be ready.
   * Lightning apps use hash-based routing; we must wait for LWC to hydrate.
   */
  async navigateTo(path: string): Promise<void> {
    await this.page.goto(path, { waitUntil: "domcontentloaded" });
    await this.waitForLightningReady();
  }

  // ─── Lightning Readiness ───────────────────────────────────────────────────

  /**
   * Wait for Lightning to finish rendering after navigation or user interaction.
   * This handles the multi-phase loading common in Salesforce Lightning pages.
   */
  async waitForLightningReady(): Promise<void> {
    // 1. Wait for the Lightning framework JS to execute
    await this.page.waitForLoadState("domcontentloaded");

    // 2. Wait for spinners to disappear (with a reasonable timeout)
    await this.waitForSpinnersToDisappear();

    // 3. Wait for any active LWC wire adapters to resolve
    await this.page.waitForTimeout(500);
  }

  /**
   * Wait for all Salesforce loading spinners to disappear.
   * Uses Promise.all to wait for all spinner types concurrently.
   */
  async waitForSpinnersToDisappear(timeout = 30_000): Promise<void> {
    for (const selector of this.SPINNER_SELECTORS) {
      try {
        const spinner = this.page.locator(selector).first();
        const isVisible = await spinner.isVisible();
        if (isVisible) {
          await spinner.waitFor({ state: "hidden", timeout });
        }
      } catch {
        // Spinner may not exist on this page — that's fine
      }
    }
  }

  // ─── Toast Notifications ───────────────────────────────────────────────────

  /**
   * Wait for and return the text content of a Lightning toast notification.
   * Toast messages are ephemeral — this must be called before the toast auto-dismisses.
   */
  async waitForToast(
    options: { type?: "success" | "error" | "warning" | "info"; timeout?: number } = {}
  ): Promise<string> {
    const { type, timeout = 15_000 } = options;

    let selector = "lightning-notice, .forceToastMessage, .toastMessage";
    if (type) {
      selector = `[data-type="${type}"], .slds-notify--toast.slds-theme--${type}`;
    }

    // Also handle the generic Lightning toast container
    const toastLocator = this.page.locator(
      ".slds-notify_container .slds-notify--toast, " +
      "lightning-toast-container lightning-toast, " +
      ".toastContainer .toastMessage"
    ).first();

    await toastLocator.waitFor({ state: "visible", timeout });
    const text = await toastLocator.innerText();
    return text.trim();
  }

  /**
   * Assert a success toast appears with optional text matching.
   */
  async assertSuccessToast(expectedText?: string): Promise<void> {
    const toastLocator = this.page.locator(
      ".slds-notify--toast.slds-theme--success, " +
      ".forceToastMessage[data-type='success'], " +
      "lightning-toast .slds-icon-utility-success"
    ).first();

    await expect(toastLocator).toBeVisible({ timeout: 15_000 });

    if (expectedText) {
      const container = this.page.locator(
        ".slds-notify_container, .toastContainer"
      ).first();
      await expect(container).toContainText(expectedText);
    }
  }

  // ─── Form Interactions ─────────────────────────────────────────────────────

  /**
   * Fill a Lightning input field by label text.
   * Handles both <input> and <textarea> elements within lightning-input and lightning-textarea.
   * Also handles required field labels that include asterisks (e.g., "*Account Name").
   */
  async fillFieldByLabel(label: string, value: string): Promise<void> {
    // Wait a bit for the form to fully load
    await this.page.waitForTimeout(1500);
    
    // Try multiple Lightning component patterns, including with asterisk for required fields
    const cssSelectors = [
      `lightning-input:has(label:text-is("${label}")) input`,
      `lightning-input:has(label:text-is("*${label}")) input`,
      `lightning-input:has(label:has-text("${label}")) input`,
      `lightning-textarea:has(label:text-is("${label}")) textarea`,
      `lightning-textarea:has(label:text-is("*${label}")) textarea`,
      `lightning-input:has(.slds-form-element__label:text-is("${label}")) input`,
      `lightning-input:has(.slds-form-element__label:text-is("*${label}")) input`,
      `input[name="${label}"]`,
      `input[placeholder="${label}"]`,
      `textarea[placeholder="${label}"]`,
    ];

    // Try CSS selectors first
    for (const selector of cssSelectors) {
      try {
        const locator = this.page.locator(selector).first();
        if (await locator.isVisible({ timeout: 3000 })) {
          await locator.scrollIntoViewIfNeeded();
          await locator.click();
          await locator.clear();
          await locator.fill(value);
          console.log(`Successfully filled field "${label}" using selector: ${selector}`);
          return;
        }
      } catch {
        continue;
      }
    }

    // Try XPath selectors separately (handle both with and without asterisk)
    const xpathSelectors = [
      `//label[normalize-space(text())="${label}"]/following-sibling::*//input`,
      `//label[normalize-space(text())="*${label}"]/following-sibling::*//input`,
      `//label[contains(text(), "${label}")]/following-sibling::*//input`,
      `//label[normalize-space(text())="${label}"]/..//input`,
      `//label[normalize-space(text())="*${label}"]/..//input`,
      `//label[normalize-space(text())="${label}"]/..//textarea`,
      `//label[normalize-space(text())="*${label}"]/..//textarea`,
      `//div[contains(@class, "slds-form-element")]//label[contains(., "${label}")]/..//input`,
      `//div[contains(@class, "slds-form-element")]//label[contains(., "*${label}")]/..//input`,
    ];

    for (const selector of xpathSelectors) {
      try {
        const locator = this.page.locator(selector).first();
        if (await locator.isVisible({ timeout: 3000 })) {
          await locator.scrollIntoViewIfNeeded();
          await locator.click();
          await locator.clear();
          await locator.fill(value);
          console.log(`Successfully filled field "${label}" using XPath: ${selector}`);
          return;
        }
      } catch {
        continue;
      }
    }

    // Log available labels for debugging
    console.log(`Could not find field with label: "${label}". Checking available labels...`);
    const allLabels = await this.page.locator('label').allTextContents();
    console.log('Available labels on page:', allLabels.slice(0, 20));

    throw new Error(`Could not find field with label: "${label}"`);
  }

  /**
   * Select a value from a Lightning combobox/picklist by label.
   */
  async selectPicklistByLabel(label: string, value: string): Promise<void> {
    // Lightning combobox pattern
    const comboboxSelectors = [
      `lightning-combobox:has(label:text-is("${label}"))`,
      `lightning-select:has(label:text-is("${label}"))`,
      `//label[normalize-space(text())="${label}"]/ancestor::lightning-combobox`,
    ];

    let combobox: Locator | null = null;

    for (const selector of comboboxSelectors) {
      try {
        const loc = this.page.locator(selector).first();
        if (await loc.isVisible({ timeout: 3000 })) {
          combobox = loc;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!combobox) {
      // Fallback: try <select> element (lightning-select)
      const selectXpath = `//label[normalize-space(text())="${label}"]/following-sibling::div//select`;
      const selectEl = this.page.locator(selectXpath).first();
      if (await selectEl.isVisible({ timeout: 3000 })) {
        await selectEl.selectOption({ label: value });
        return;
      }
      throw new Error(`Could not find picklist with label: "${label}"`);
    }

    // Open the dropdown
    const button = combobox.locator("button, input[role='combobox']").first();
    await button.click();

    // Wait for dropdown options to appear
    await this.page.waitForTimeout(1000);

    // Try multiple selector strategies for the dropdown option
    const optionSelectors = [
      `lightning-base-combobox-item:has-text("${value}")`,
      `[role="option"]:has-text("${value}")`,
      `lightning-base-combobox-item span:text-is("${value}")`,
      `[role="option"] span.slds-truncate:text-is("${value}")`,
    ];

    for (const selector of optionSelectors) {
      try {
        const option = this.page.locator(selector).first();
        if (await option.isVisible({ timeout: 3000 })) {
          await option.click();
          await this.page.waitForTimeout(300);
          console.log(`Successfully selected "${value}" from picklist "${label}"`);
          return;
        }
      } catch {
        continue;
      }
    }

    throw new Error(`Could not find picklist option "${value}" for "${label}"`);
  }

  /**
   * Set a date field value (handles both date inputs and custom Lightning date pickers).
   */
  async setDateField(label: string, dateValue: string): Promise<void> {
    const inputSelectors = [
      `lightning-datepicker:has(label:text-is("${label}")) input`,
      `//label[normalize-space(text())="${label}"]/..//input[@type="text" or @placeholder]`,
    ];

    for (const selector of inputSelectors) {
      try {
        const input = this.page.locator(selector).first();
        if (await input.isVisible({ timeout: 3000 })) {
          await input.click();
          await input.clear();
          await input.fill(dateValue);
          // Press Tab to confirm the date and close the picker
          await input.press("Tab");
          await this.page.waitForTimeout(300);
          return;
        }
      } catch {
        continue;
      }
    }

    throw new Error(`Could not find date field with label: "${label}"`);
  }

  // ─── Lookup Fields ─────────────────────────────────────────────────────────

  /**
   * Fill a Lightning lookup field (Account Name, etc.) by searching and selecting.
   */
  async fillLookupField(label: string, searchValue: string): Promise<void> {
    const lookupSelectors = [
      `lightning-lookup:has(label:text-is("${label}")) input`,
      `lightning-lookup:has(label:text-is("*${label}")) input`,
      `//label[normalize-space(text())="${label}"]/ancestor::lightning-lookup//input`,
      `//label[normalize-space(text())="*${label}"]/ancestor::lightning-lookup//input`,
      `//label[normalize-space(text())="${label}"]/..//input[@data-id]`,
    ];

    let input: Locator | null = null;

    for (const selector of lookupSelectors) {
      try {
        const loc = this.page.locator(selector).first();
        if (await loc.isVisible({ timeout: 3000 })) {
          input = loc;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!input) {
      throw new Error(`Could not find lookup field with label: "${label}"`);
    }

    await input.scrollIntoViewIfNeeded();
    await input.click();
    await input.fill(searchValue);

    // Wait for the dropdown to populate
    await this.page.waitForTimeout(1500);

    // Select the FIRST matching item from Recent Items (not "Show more results" option)
    // The first actual result is usually in lightning-base-combobox-item
    const dropdownSelectors = [
      // First try to find the actual record items (not search options)
      `lightning-base-combobox-item[data-value]:has-text("${searchValue}")`,
      `lightning-base-combobox-item:not(:has-text("Show more")):has-text("${searchValue}")`,
      // Then try generic role options that aren't search-related
      `[role="option"][data-recordid]:has-text("${searchValue}")`,
      `[role="option"]:not(:has-text("Show more")):has-text("${searchValue}")`,
      // Fallback to any matching option
      `lightning-base-combobox-item:has-text("${searchValue}")`,
      `[role="option"]:has-text("${searchValue}")`,
    ];

    for (const selector of dropdownSelectors) {
      try {
        const dropdownItem = this.page.locator(selector).first();
        if (await dropdownItem.isVisible({ timeout: 3000 })) {
          // Make sure it's not the "Show more results" option
          const text = await dropdownItem.textContent();
          if (text && !text.includes('Show more') && !text.includes('Search')) {
            await dropdownItem.click();
            await this.page.waitForTimeout(300);
            console.log(`Successfully selected first "${searchValue}" result in lookup field "${label}"`);
            return;
          }
        }
      } catch {
        continue;
      }
    }

    throw new Error(`Could not find dropdown option "${searchValue}" for lookup field "${label}"`);
  }

  // ─── Record Actions ─────────────────────────────────────────────────────────

  /**
   * Click a button by its visible text, handling both standard and Lightning buttons.
   */
  async clickButton(buttonText: string): Promise<void> {
    // Wait a bit for buttons to become interactive
    await this.page.waitForTimeout(500);
    
    const selectors = [
      `button:text-is("${buttonText}")`,
      `button:has-text("${buttonText}")`,
      `input[value="${buttonText}"]`,
      `lightning-button button:text-is("${buttonText}")`,
      `[title="${buttonText}"]`,
      `//button[normalize-space(.)="${buttonText}"]`,
    ];

    for (const selector of selectors) {
      try {
        const button = this.page.locator(selector).first();
        if (await button.isVisible({ timeout: 5000 })) {
          // Wait for button to be enabled
          await button.waitFor({ state: "visible", timeout: 5000 });
          await button.click();
          return;
        }
      } catch {
        continue;
      }
    }

    throw new Error(`Could not find button: "${buttonText}"`);
  }

  /**
   * Get a field value from a Lightning detail view (read-only record page).
   */
  async getFieldValue(fieldLabel: string): Promise<string> {
    // Wait a bit for the page to fully render
    await this.page.waitForTimeout(1000);

    const selectors = [
      // Standard record layout item patterns
      `//div[contains(@class,"slds-form-element__label")][normalize-space(text())="${fieldLabel}"]/following-sibling::div//span`,
      `//div[contains(@class,"slds-form-element__label")][normalize-space(text())="${fieldLabel}"]/..//div[contains(@class,"slds-form-element__control")]//span`,
      `records-record-layout-item:has(span:text-is("${fieldLabel}")) .slds-form-element__static`,
      `records-record-layout-item:has(span:text-is("${fieldLabel}")) lightning-formatted-text`,
      // Highlights panel (top of page)
      `//dt[normalize-space(.)="${fieldLabel}"]/following-sibling::dd[1]`,
      `//span[normalize-space(.)="${fieldLabel}"]/following-sibling::*`,
      // Generic patterns
      `//label[normalize-space(.)="${fieldLabel}"]/..//span[contains(@class, "uiOutputText")]`,
      `//label[normalize-space(.)="${fieldLabel}"]/..//lightning-formatted-text`,
    ];

    for (const selector of selectors) {
      try {
        const element = this.page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 })) {
          const text = (await element.innerText()).trim();
          if (text) {
            console.log(`Found field "${fieldLabel}" value: "${text}" using selector: ${selector}`);
            return text;
          }
        }
      } catch {
        continue;
      }
    }

    // Log available fields for debugging
    console.log(`Could not find field "${fieldLabel}". Looking for field labels...`);
    const labels = await this.page.locator('.slds-form-element__label, dt, label').allTextContents();
    console.log('Available field labels:', labels.slice(0, 15));

    throw new Error(`Could not read field value for: "${fieldLabel}"`);
  }

  // ─── URL Helpers ───────────────────────────────────────────────────────────

  /**
   * Extract the Salesforce record ID from the current page URL.
   * Lightning URLs follow the pattern: /lightning/r/ObjectName/RECORD_ID/view
   */
  getCurrentRecordId(): string {
    const url = this.page.url();
    const match = url.match(/\/([a-zA-Z0-9]{15,18})\/view/);
    if (!match) {
      throw new Error(`Could not extract record ID from URL: ${url}`);
    }
    return match[1];
  }
}
