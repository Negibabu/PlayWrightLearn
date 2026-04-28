/**
 * AccountPage
 *
 * Page Object for Salesforce Account records in Lightning Experience.
 * Supports creating accounts, viewing related lists, and record validation.
 */
import { Page, expect } from "@playwright/test";
import { BaseLightningPage } from "./BaseLightningPage";

export class AccountPage extends BaseLightningPage {
  constructor(page: Page) {
    super(page);
  }

  // ─── Navigation ────────────────────────────────────────────────────────────

  async navigateToAccountList(): Promise<void> {
    await this.navigateTo("/lightning/o/Account/list");
    await this.waitForLightningReady();
  }

  async navigateToNewAccountForm(): Promise<void> {
    await this.navigateTo("/lightning/o/Account/new");
    await this.waitForLightningReady();
  }

  async navigateToAccount(accountId: string): Promise<void> {
    await this.navigateTo(`/lightning/r/Account/${accountId}/view`);
    await this.waitForLightningReady();
  }

  // ─── Create ────────────────────────────────────────────────────────────────

  /**
   * Create an Account if it does not already exist.
   * Returns the Account ID.
   */
  async createAccountIfNotExists(accountName: string): Promise<string> {
    // Small delay to allow the app/navigation to stabilize before attempting to find/create the account
    await this.page.waitForTimeout(3000);

    const existingId = await this.findAccountByName(accountName);
    console.log(existingId);
    if (existingId) {
      console.log(`Account "${accountName}" already exists with ID: ${existingId}`);
      return existingId;
    }
 
    return await this.createAccount(accountName);
  }

  async createAccount(accountName: string): Promise<string> {
    await this.navigateToNewAccountForm();

    // Fill the Account Name field
    // Note: fillFieldByLabel now handles labels with asterisks (e.g., "*Account Name")
    await this.fillFieldByLabel("Account Name", accountName);

    // Save the record
    await this.clickButton("Save");
    
    // Wait for Lightning to process the save and show success toast
    await this.waitForLightningReady();
    await this.assertSuccessToast();
    
    // Wait a bit more for any redirects to complete
    await this.page.waitForTimeout(2000);
    
    // Try to get the account ID from the URL
    let accountId: string;
    try {
      accountId = this.getCurrentRecordId();
    } catch (error) {
      // If not on detail page yet, extract ID from current URL
      const currentUrl = this.page.url();
      console.log(`Current URL after save: ${currentUrl}`);
      
      const idMatch = currentUrl.match(/[a-zA-Z0-9]{15,18}(?=\/|$)/);
      if (idMatch) {
        accountId = idMatch[0];
        console.log(`Extracted Account ID from URL: ${accountId}`);
      } else {
        throw new Error(`Could not extract Account ID from URL: ${currentUrl}`);
      }
    }
    
    console.log(`Created Account "${accountName}" with ID: ${accountId}`);
    return accountId;
  }

  // ─── Search ────────────────────────────────────────────────────────────────

  /**
   * Find an Account by name using the list view search.
   * Returns the record ID if found, or null.
   */
  async findAccountByName(accountName: string): Promise<string | null> {
    try {
      // Navigate to the Account list view
      await this.navigateTo("/lightning/o/Account/list?filterName=Recent");

      // Wait a bit more for the list to load
      await this.page.waitForTimeout(4000);

      // Try to find the account link in the list view with multiple selector strategies
      const accountSelectors = [
        `a[title="${accountName}"]`,
        `a:text-is("${accountName}")`,
        `th a:has-text("${accountName}")`,
        `lightning-formatted-url a:has-text("${accountName}")`,
      ];

      for (const selector of accountSelectors) {
        try {
          const accountLink = this.page.locator(selector).first();
          if (await accountLink.isVisible({ timeout: 3000 })) {
            const href = await accountLink.getAttribute("href");
            if (href) {
              const match = href.match(/\/([a-zA-Z0-9]{15,18})\/view/);
              if (match) {
                console.log(`Found existing Account "${accountName}" with ID: ${match[1]}`);
                return match[1];
              }
            }
            // If we can't extract from href, click and get from URL
            await accountLink.click();
            await this.waitForLightningReady();
            const id = this.getCurrentRecordId();
            console.log(`Found existing Account "${accountName}" with ID: ${id}`);
            return id;
          }
        } catch {
          continue;
        }
      }

      console.log(`Account "${accountName}" not found in list view`);
      return null;
    } catch (error) {
      console.log(`Error searching for Account "${accountName}":`, error);
      return null;
    }
  }

  // ─── Validation ────────────────────────────────────────────────────────────

  /**
   * Validate that a specific Opportunity appears in the Account's Opportunities
   * related list. Scrolls to the related list to ensure it is loaded.
   */
  async validateOpportunityInRelatedList(
    opportunityName: string
  ): Promise<void> {
    // Wait a bit for the page to fully load
    await this.waitForLightningReady();
    await this.page.waitForTimeout(2000);

    // Scroll down to load related lists (lazy-loaded in Lightning)
    await this.scrollToRelatedList("Opportunities");

    // Wait for the related list panel to render
    const relatedListHeader = this.page
      .locator(
        'span.slds-card__header-title:text-is("Opportunities"), ' +
        'h2:text-is("Opportunities"), ' +
        '[data-component-id="force_relatedListContainer"] span:text-is("Opportunities")'
      )
      .first();

    await expect(relatedListHeader).toBeVisible({ timeout: 20_000 });
    console.log('✅ Opportunities related list header found');

    // Try to refresh the related list to ensure latest data
    try {
      const refreshButton = this.page
        .locator('button[title="Refresh"], button:has-text("Refresh")')
        .first();
      
      if (await refreshButton.isVisible({ timeout: 2000 })) {
        console.log('Clicking Refresh button on related list...');
        await refreshButton.click();
        await this.page.waitForTimeout(2000);
      }
    } catch {
      console.log('No Refresh button found, continuing...');
    }

    // Wait longer for the related list data to load after refresh
    await this.page.waitForTimeout(3000);

    // Try multiple selector strategies to find the opportunity
    const opportunitySelectors = [
      `lightning-formatted-url a:has-text("${opportunityName}")`,
      `a[title*="${opportunityName}"]`,
      `a:has-text("${opportunityName}")`,
      `th a:has-text("${opportunityName}")`,
      `//a[contains(., "${opportunityName}")]`,
    ];

    let found = false;
    for (const selector of opportunitySelectors) {
      try {
        const opportunityLink = this.page.locator(selector).first();
        if (await opportunityLink.isVisible({ timeout: 5000 })) {
          console.log(
            `✅ Opportunity "${opportunityName}" found in Account's related list using: ${selector}`
          );
          found = true;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!found) {
      // Try clicking "View All" to see if the opportunity is in a paginated view
      try {
        const viewAllButton = this.page
          .locator('a:has-text("View All"), button:has-text("View All")')
          .first();
        
        if (await viewAllButton.isVisible({ timeout: 2000 })) {
          console.log('Clicking "View All" to see all opportunities...');
          await viewAllButton.click();
          await this.waitForLightningReady();
          await this.page.waitForTimeout(2000);
          
          // Try selectors again on the full list view
          for (const selector of opportunitySelectors) {
            try {
              const opportunityLink = this.page.locator(selector).first();
              if (await opportunityLink.isVisible({ timeout: 5000 })) {
                console.log(
                  `✅ Opportunity "${opportunityName}" found in full list view using: ${selector}`
                );
                found = true;
                break;
              }
            } catch {
              continue;
            }
          }
        }
      } catch {
        console.log('No "View All" button found or error clicking it');
      }
    }

    if (!found) {
      // Log what we can see for debugging
      console.log('❌ Opportunity not found. Debugging related list content:');
      const allLinks = await this.page.locator('a').allTextContents();
      const filteredLinks = allLinks.filter(t => t.trim());
      console.log(`Total links found: ${filteredLinks.length}`);
      console.log('First 30 links:', filteredLinks.slice(0, 30));
      
      // Also try to get text from the related list specifically
      try {
        const relatedListText = await this.page
          .locator('[data-component-id*="relatedList"]')
          .first()
          .textContent();
        console.log('Related list text content:', relatedListText?.slice(0, 500));
      } catch {
        console.log('Could not get related list text content');
      }
      
      throw new Error(
        `Could not find Opportunity "${opportunityName}" in Account's related list`
      );
    }
  }

  /**
   * Scroll the page until the related list with the given title is visible.
   */
  private async scrollToRelatedList(listName: string): Promise<void> {
    const relatedListSelector =
      `[data-component-id*="relatedList"], ` +
      `records-related-list-container, ` +
      `force-related-list-container`;

    // Scroll incrementally until the related list comes into view
    for (let i = 0; i < 5; i++) {
      await this.page.evaluate('window.scrollBy(0, 400)');
      await this.page.waitForTimeout(500);

      const headerVisible = await this.page
        .locator(`span:text-is("${listName}")`)
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      if (headerVisible) break;
    }
  }
}