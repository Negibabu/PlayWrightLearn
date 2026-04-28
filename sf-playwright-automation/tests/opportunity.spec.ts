/**
 * Scenario 1: Opportunity Creation and Validation
 *
 * 1. Verify the Quantity custom field exists on Opportunity layout
 * 2. Create Account "A1" if it doesn't exist
 * 3. Create a new Opportunity associated with A1
 * 4. Populate all available fields including Quantity
 * 5. Validate entered data on the Opportunity Details page
 * 6. Navigate to A1 and validate Opportunity appears in related list
 */

import { test, expect } from "../src/fixtures/salesforce.fixtures";
import { SharedState } from "../src/fixtures/salesforce.fixtures";

test.describe("Scenario 1: Opportunity Creation and Validation", () => {
  test.describe.configure({ mode: "serial" }); // Steps must run in order

  test(
    "1.1 - Verify Quantity custom field is available on Opportunity layout",
    async ({ opportunityPage, page, testConfig }) => {
      // Navigate to the New Opportunity form and confirm Quantity field is present
      await opportunityPage.navigateToNewOpportunityForm();

      // The Quantity field should be visible in the form
      // Try multiple selectors to find the Quantity field
      const quantityField = page.locator(
        'lightning-input:has(label:text-is("Quantity")), ' +
          'input[name="Quantity__c"]'
      ).first();

      await expect(quantityField).toBeVisible({
        timeout: 15_000,
      });

      console.log("✅ Quantity custom field is present on Opportunity layout");

      // Wait for 3 seconds before canceling
      await page.waitForTimeout(3000);

      // Cancel / close the modal without saving
      const cancelButton = page
        .locator('button:text-is("Cancel"), button[title="Cancel"]')
        .first();
      if (await cancelButton.isVisible({ timeout: 3000 })) {
        await cancelButton.click();
      }
    }
  );

  test(
    "1.2 - Create Account A1 if it does not already exist",
    async ({ accountPage, testConfig }) => {
      const accountId = await accountPage.createAccountIfNotExists(
        testConfig.accountName
      );

      expect(accountId).toBeTruthy();
      SharedState.setAccountId(accountId);

      console.log(
        `✅ Account "${testConfig.accountName}" ready with ID: ${accountId}`
      );
    }
  );

  test(
    "1.3 - Create new Opportunity associated with Account A1",
    async ({ opportunityPage, testConfig }) => {
      const opportunityData = {
        name: testConfig.opportunityName,
        accountName: testConfig.accountName,
        closeDate: testConfig.closeDate,
        stageName: testConfig.stageName,
        amount: testConfig.amount,
        quantity: testConfig.quantity,
        description: testConfig.description,
        leadSource: testConfig.leadSource,
        type: testConfig.type,
        probability: testConfig.probability,
        nextStep: "Schedule demo call",
      };

      const opportunityId = await opportunityPage.createOpportunity(
        opportunityData
      );

      expect(opportunityId).toBeTruthy();
      SharedState.setOpportunityId(opportunityId);

      console.log(
        `✅ Opportunity "${testConfig.opportunityName}" created with ID: ${opportunityId}`
      );
    }
  );

  test(
    "1.4 - Validate all field data on the Opportunity Details page",
    async ({ opportunityPage, testConfig }) => {
      const opportunityId = SharedState.opportunityId;
      expect(opportunityId).toBeTruthy();

      await opportunityPage.navigateToOpportunity(opportunityId);

      await opportunityPage.validateOpportunityDetails({
        name: testConfig.opportunityName,
        accountName: testConfig.accountName,
        closeDate: testConfig.closeDate,
        stageName: testConfig.stageName,
        amount: testConfig.amount,
        quantity: testConfig.quantity,
        type: testConfig.type,
        leadSource: testConfig.leadSource,
      });
    }
  );

  test(
    "1.5 - Navigate to Account A1 and validate Opportunity in related list",
    async ({ accountPage, testConfig }) => {
      const accountId = SharedState.accountId;
      expect(accountId).toBeTruthy();

      await accountPage.navigateToAccount(accountId);

      await accountPage.validateOpportunityInRelatedList(
        testConfig.opportunityName
      );
    }
  );
});
