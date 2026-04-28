/**
 * OpportunityPage
 *
 * Page Object for Salesforce Opportunity records in Lightning Experience.
 * Handles creation with all standard + custom fields, and read-only validation.
 */
import { Page, expect } from "@playwright/test";
import { BaseLightningPage } from "./BaseLightningPage";

export interface OpportunityData {
  name: string;
  accountName: string;
  closeDate: string;
  stageName: string;
  amount?: string;
  quantity?: string;
  description?: string;
  leadSource?: string;
  type?: string;
  probability?: string;
  nextStep?: string;
}

export class OpportunityPage extends BaseLightningPage {
  constructor(page: Page) {
    super(page);
    
  }

  // ─── Navigation ────────────────────────────────────────────────────────────

  async navigateToNewOpportunityForm(): Promise<void> {
    await this.navigateTo("/lightning/o/Opportunity/new");
    await this.waitForLightningReady();
  }

  async navigateToOpportunity(opportunityId: string): Promise<void> {
    await this.navigateTo(`/lightning/r/Opportunity/${opportunityId}/view`);
    await this.waitForLightningReady();
  }

  // ─── Create ────────────────────────────────────────────────────────────────

  /**
   * Wait for the New Opportunity modal/form to be ready.
   */
  private async waitForNewOpportunityModalReady(): Promise<void> {
    // Wait for the modal dialog or form container to be visible
    const modalSelectors = [
      'div.modal-container',
      'div.slds-modal',
      'records-record-edit-form',
      'forceRecordEditFormContainer',
      'div[aria-label*="New Opportunity"]',
    ];

    let modalVisible = false;
    for (const selector of modalSelectors) {
      try {
        const modal = this.page.locator(selector).first();
        if (await modal.isVisible({ timeout: 5000 })) {
          console.log(`New Opportunity modal detected using: ${selector}`);
          modalVisible = true;
          break;
        }
      } catch {
        continue;
      }
    }

    // Wait for form to be fully rendered
    await this.page.waitForTimeout(2000);

    // Ensure at least one input field is visible (form is ready)
    const formInputs = this.page.locator('input[type="text"], textarea, input[role="combobox"]');
    await formInputs.first().waitFor({ state: 'visible', timeout: 10000 });
    
    console.log('✅ New Opportunity form is ready');
  }

  /**
   * Create a new Opportunity and populate all provided fields.
   * Returns the newly created Opportunity ID.
   */
  async createOpportunity(data: OpportunityData): Promise<string> {
    await this.navigateToNewOpportunityForm();

    // Wait for the New Opportunity modal/form to be fully ready
    await this.waitForNewOpportunityModalReady();

    // Required fields
    await this.fillFieldByLabel("Opportunity Name", data.name);
    await this.fillLookupField("Account Name", data.accountName);
    await this.setDateField("Close Date", data.closeDate);
    await this.selectPicklistByLabel("Stage", data.stageName);

    // Optional standard fields
    if (data.amount) {
      await this.fillFieldByLabel("Amount", data.amount);
    }
    if (data.type) {
      await this.selectPicklistByLabel("Type", data.type);
    }
    if (data.leadSource) {
      await this.selectPicklistByLabel("Lead Source", data.leadSource);
    }
    if (data.probability) {
      await this.fillFieldByLabel("Probability (%)", data.probability);
    }
    if (data.nextStep) {
      await this.fillFieldByLabel("Next Step", data.nextStep);
    }
    if (data.description) {
      await this.fillFieldByLabel("Description", data.description);
    }

    // Custom Quantity field
    if (data.quantity) {
      await this.fillQuantityField(data.quantity);
    }

    // Save
    await this.clickButton("Save");
    await this.waitForLightningReady();
    await this.assertSuccessToast();

    const oppId = this.getCurrentRecordId();
    console.log(`Created Opportunity "${data.name}" with ID: ${oppId}`);
    return oppId;
  }

  /**
   * Fill the custom Quantity field. It may appear in various positions
   * depending on the layout configuration.
   */
  private async fillQuantityField(value: string): Promise<void> {
    // Try standard label-based lookup first
    try {
      await this.fillFieldByLabel("Quantity", value);
      return;
    } catch {
      // Field label might differ — try API name fallback
    }

    // Fallback: locate input with data-field-name or name="Quantity__c"
    const quantitySelectors = [
      'input[name="Quantity__c"]',
      '[data-field="Quantity__c"] input',
      'lightning-input:has(label:text-is("Quantity")) input',
      '//label[contains(text(),"Quantity")]/following-sibling::*//input',
    ];

    for (const selector of quantitySelectors) {
      try {
        const input = this.page.locator(selector).first();
        if (await input.isVisible({ timeout: 3000 })) {
          await input.clear();
          await input.fill(value);
          return;
        }
      } catch {
        continue;
      }
    }

    throw new Error(`Could not find Quantity field. Ensure it is on the page layout.`);
  }

  // ─── Validation ────────────────────────────────────────────────────────────

  /**
   * Click the Details tab on the record page to view all fields.
   */
  private async clickDetailsTab(): Promise<void> {
    const detailsTabSelectors = [
      'a[data-tab-value="detailTab"]',
      'a[title="Details"]',
      'a:has-text("Details")',
      '//a[contains(@class, "slds-tabs")][normalize-space(.)="Details"]',
    ];

    for (const selector of detailsTabSelectors) {
      try {
        const tab = this.page.locator(selector).first();
        if (await tab.isVisible({ timeout: 3000 })) {
          await tab.click();
          await this.waitForLightningReady();
          console.log('Clicked Details tab');
          return;
        }
      } catch {
        continue;
      }
    }

    // If Details tab not found, we might already be on it or it might not exist
    console.log('Details tab not found or already active');
  }

  /**
   * Validate all field values on the Opportunity detail page.
   * This method asserts both in the highlights panel and detail sections.
   */
  async validateOpportunityDetails(data: OpportunityData): Promise<void> {
    await this.waitForLightningReady();

    // Validate the page title / record name
    const titleLocator = this.page.locator(
      '.slds-page-header__title span, ' +
      'lightning-formatted-text[slot="primaryField"], ' +
      '.forceActionsText, ' +
      'records-highlights2 h1 lightning-formatted-text'
    ).first();

    await expect(titleLocator).toContainText(data.name, { timeout: 15_000 });

    // Navigate to Details tab to see all fields
    await this.clickDetailsTab();

    // Validate detail fields
    await this.validateDetailField("Stage", data.stageName);
    await this.validateDetailField("Close Date", data.closeDate);

    if (data.accountName) {
      await this.validateDetailField("Account Name", data.accountName);
    }
    if (data.amount) {
      // Amount is formatted with currency symbol — check the numeric part
      await this.assertFieldContainsText("Amount", data.amount.replace(/,/g, ""));
    }
    if (data.quantity) {
      await this.validateDetailField("Quantity", data.quantity);
    }
    if (data.type) {
      await this.validateDetailField("Type", data.type);
    }
    if (data.leadSource) {
      await this.validateDetailField("Lead Source", data.leadSource);
    }

    console.log(`✅ Opportunity details validated for "${data.name}"`);
  }

  private async validateDetailField(
    fieldLabel: string,
    expectedValue: string
  ): Promise<void> {
    const fieldLocator = this.page.locator(
      `//span[@data-output-element-id="output-field"]/ancestor::*//div[contains(@class,"slds-form-element__label")][normalize-space(text())="${fieldLabel}"]/following-sibling::div//span, ` +
      `records-record-layout-item:has(span:text-is("${fieldLabel}")) .slds-form-element__static, ` +
      `//dt[normalize-space(.)="${fieldLabel}"]/following-sibling::dd[1]`
    ).first();

    try {
      await expect(fieldLocator).toBeVisible({ timeout: 10_000 });
      await expect(fieldLocator).toContainText(expectedValue, {
        timeout: 5000,
      });
    } catch {
      // Some fields render differently; use the generic getter
      const value = await this.getFieldValue(fieldLabel).catch(() => "");
      if (!value.includes(expectedValue)) {
        throw new Error(
          `Field "${fieldLabel}": expected "${expectedValue}" but got "${value}"`
        );
      }
    }
  }

  private async assertFieldContainsText(
    fieldLabel: string,
    partialValue: string
  ): Promise<void> {
    const rawValue = await this.getFieldValue(fieldLabel).catch(() => "");
    if (!rawValue.replace(/,/g, "").includes(partialValue)) {
      throw new Error(
        `Field "${fieldLabel}": expected to contain "${partialValue}" but got "${rawValue}"`
      );
    }
  }

  // ─── Edit Mode ─────────────────────────────────────────────────────────────

  /**
   * Attempt to click the Edit button. Returns false if the button is absent
   * (indicating read-only access for the current user).
   */
  async tryClickEdit(): Promise<boolean> {
    const editButtonSelectors = [
      'button:text-is("Edit")',
      'a:text-is("Edit")',
      '[title="Edit"]',
    ];

    for (const selector of editButtonSelectors) {
      const button = this.page.locator(selector).first();
      if (await button.isVisible({ timeout: 3000 })) {
        await button.click();
        return true;
      }
    }

    return false;
  }

  /**
   * Assert that the Opportunity is in read-only mode for the current user.
   * Confirms: no Edit button, no inline-edit, no Save/Cancel.
   */
  async assertReadOnly(): Promise<void> {
    // Edit button should not be present
    const editButton = this.page.locator('button:text-is("Edit"), a:text-is("Edit")').first();
    await expect(editButton).not.toBeVisible({ timeout: 5000 });

    // Inline-edit pencil icons should not appear
    const pencilIcons = this.page.locator(
      '[title="Edit this field"], .slds-icon-utility-edit'
    );
    const pencilCount = await pencilIcons.count();
    expect(pencilCount).toBe(0);

    console.log("✅ Opportunity is read-only for current user");
  }

  /**
   * Assert that the current user can view the Opportunity (record is visible and loads).
   */
  async assertCanView(opportunityId: string): Promise<void> {
    await this.navigateToOpportunity(opportunityId);

    // The record name should be visible
    const titleLocator = this.page.locator(
      '.slds-page-header__title, records-highlights2 h1, .forceActionsText'
    ).first();

    await expect(titleLocator).toBeVisible({ timeout: 20_000 });

    // Ensure we didn't land on an error page
    const errorPage = this.page.locator(
      '.pageError, [data-error-type], div.errorTitle'
    );
    await expect(errorPage).not.toBeVisible({ timeout: 3000 });

    console.log(`✅ User can view Opportunity ${opportunityId}`);
  }
}
