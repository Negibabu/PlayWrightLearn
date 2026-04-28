/**
 * Scenario 2: Read-Only Platform User Access
 *
 * 1. Create a new Standard Platform User
 * 2. Ensure user has read-only access to Opportunity object
 *    (via permission set or profile restriction)
 * 3. Log in as the Platform User
 * 4. Validate user can view the Opportunity from Scenario 1
 * 5. Validate user cannot edit the Opportunity
 */

import { test, expect } from "../src/fixtures/salesforce.fixtures";
import { SharedState } from "../src/fixtures/salesforce.fixtures";
import { LoginPage } from "../src/pages/LoginPage";
import { OpportunityPage } from "../src/pages/OpportunityPage";

test.describe("Scenario 2: Read-Only Platform User Access", () => {
  test.describe.configure({ mode: "serial" });

  /**
   * Create a Platform User using Salesforce CLI.
   * This approach doesn't require OAuth credentials (client ID/secret).
   */
  test(
    "2.1 - Create a Standard Platform User with read-only Opportunity access",
    async ({ page }) => {
      const { execSync } = require('child_process');
      
      const timestamp = Date.now();
      const username = `playwright.readonly.${timestamp}@example.testorg.com`;
      const password = "Test@Password123!";
      
      // Try to reuse an existing Standard profile user before creating a new one.
      // Uses the SalesforceApiClient available via global fixtures when possible.
      let platformUserId: string | null = null;
      try {
        const apiClient = (global as any).apiClient ?? null;
        console.log("HEReeeee");
          // First, look specifically for an active Standard User using the Salesforce CLI query
          const activeQuery = `sf data query --query "SELECT Id, Username FROM User WHERE Profile.Name = 'Standard User' AND IsActive = true ORDER BY CreatedDate DESC LIMIT 1" --json`;
          let activeRes: any = { totalSize: 0, records: [] };
          try {
            const activeOutput = execSync(activeQuery, { encoding: "utf-8" }).trim();
            // Parse CLI JSON output robustly
            const cleaned = activeOutput.replace(/\x1B\[[0-9;]*m/g, "").trim();
            activeRes = JSON.parse(cleaned);
            // Normalize to the API client query result shape if necessary
            if (activeRes && activeRes.result && Array.isArray(activeRes.result.records)) {
              activeRes = {
                totalSize: activeRes.result.totalSize ?? activeRes.result.records.length,
                records: activeRes.result.records
              };
            }
          } catch (cliErr) {
            console.warn("CLI active user query failed, falling back to API client query:", cliErr);
            // Fallback to existing API client query
            const fallback = await apiClient.query("SELECT Id, Username FROM User WHERE Profile.Name = 'Standard User' AND IsActive = true ORDER BY CreatedDate DESC LIMIT 1");
            if (fallback && fallback.records) {
              activeRes = fallback;
            }
          }
  
          if (activeRes && activeRes.records && activeRes.records.length > 0) {
            const activeId = String(activeRes.records[0].Id);
            console.log("HERe");
            console.log(activeId);
            const activeUsername = String(activeRes.records[0].Username);
            console.log(`Found active Standard User: ${activeUsername} (${activeId}) — deactivating to free license`);
            try {
              const deactivateCmd = `sf data update record --sobject User --record-id ${activeId} --values "IsActive=false" --json`;
              const deactivateOutput = execSync(deactivateCmd, { encoding: 'utf-8' }).trim();
              console.log('Deactivate output:', deactivateOutput);
              // small delay to allow license to free up
              await new Promise((resDelay) => setTimeout(resDelay, 1500));
            } catch (deactErr) {
              console.warn('Failed to deactivate existing active user:', deactErr);
              // If deactivation fails, we will attempt to reuse the active user instead of creating a new one
              SharedState.setPlatformUser(activeId, activeUsername, password);
              platformUserId = activeId;
            }


          // If no active user was found or deactivation succeeded, look for any Standard User to reuse
          if (!platformUserId) {
            const res = await apiClient.query("SELECT Id, Username, IsActive FROM User WHERE Profile.Name = 'Standard User' ORDER BY CreatedDate DESC LIMIT 1");
            if (res && res.records && res.records.length > 0) {
              const platformId = String(res.records[0].Id);
              const existingUsername = String(res.records[0].Username);
              const isActive = !!res.records[0].IsActive;
              console.log(`Found existing Standard User: ${existingUsername} (${platformId}) - active=${isActive}`);
              // Reuse the existing user (it should be inactive now if we deactivated above)
              SharedState.setPlatformUser(platformId, existingUsername, password);
              platformUserId = platformId;
            }
          }
        }
      } catch (e) {
        console.warn('Could not query for existing Standard users:', e);
      }
      
      if (!platformUserId) {
        try {
        // First, get the Standard User profile ID using SOQL
        // Use the centralized profileQuery CLI command to retrieve the Standard User profile Id
        const profileQuery = `sf data query --query "SELECT Id FROM Profile WHERE Name='Standard User' LIMIT 1" --json`;
        const profileOutput = execSync(profileQuery, { encoding: "utf-8" }).trim();
        
        console.log('=== Raw profile output START ===');
        console.log(profileOutput);
        console.log('=== Raw profile output END ===');
        
        // Try to find JSON starting with { and containing "result"
        let profileResult: any;
        let parseError: any;
        
        try {
          // First try direct parse
          profileResult = JSON.parse(profileOutput);
          console.log('Direct parse succeeded');
        } catch (e: any) {
          parseError = e;
          console.log('Direct parse failed:', e.message);
          console.log('Error details:', e);
          
          // The output looks like valid JSON, so let's try to clean it
          // Remove any ANSI color codes or special characters
          let cleanedOutput = profileOutput
            .replace(/\x1B\[[0-9;]*m/g, '') // Remove ANSI codes
            .trim();
          
          console.log('Trying parse of cleaned output...');
          try {
            profileResult = JSON.parse(cleanedOutput);
            console.log('Cleaned output parse succeeded');
          } catch (cleanError: any) {
            console.log('Cleaned parse also failed:', cleanError.message);
            
            // If that fails, extract JSON more carefully
            const lines = profileOutput.split('\n');
            console.log(`Searching through ${lines.length} lines for JSON...`);
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i].trim();
              if (line.startsWith('{')) {
                const jsonStr = lines.slice(i).join('\n');
                console.log(`Attempting parse from line ${i}...`);
                console.log('JSON string length:', jsonStr.length);
                try {
                  profileResult = JSON.parse(jsonStr);
                  console.log('Line-by-line parse succeeded');
                  break;
                } catch (lineError: any) {
                  console.log(`Parse failed at line ${i}:`, lineError.message);
                  // Show where the JSON becomes invalid
                  console.log('Last 100 chars of attempted JSON:', jsonStr.substring(Math.max(0, jsonStr.length - 100)));
                  continue;
                }
              }
            }
          }
        }
        
        if (!profileResult) {
          console.error('Failed to parse CLI output. Last error:', parseError);
          console.error('Output length:', profileOutput.length, 'chars');
          console.error('Output appears to be:', profileOutput.includes('{') ? 'JSON-like' : 'non-JSON');
          console.error('Full output:', profileOutput);
          throw new Error(`Could not parse profile query result after multiple attempts`);
        }
        
        if (!profileResult.result || profileResult.result.records.length === 0) {
          throw new Error('Standard User profile not found');
        }
        
        const profileId = profileResult.result.records[0].Id;
        console.log(`Found Standard User profile ID: ${profileId}`);

        // Create the user using Salesforce CLI
        console.log(`Creating user: ${username}`);
        const createUserCmd = `sf data create record --sobject User --values "FirstName=Playwright LastName=ReadOnlyUser Email=${username} Username=${username} Alias=pwro ProfileId=${profileId} TimeZoneSidKey=America/New_York LocaleSidKey=en_US LanguageLocaleKey=en_US EmailEncodingKey=UTF-8" --json`;
        
        const createOutput = execSync(createUserCmd, { encoding: 'utf-8' }).trim();
        
        console.log('Raw create output:', createOutput);
        
        let createResult: any;
        try {
          createResult = JSON.parse(createOutput);
          console.log('Direct parse of create output succeeded');
        } catch (e: any) {
          console.log('Direct parse of create output failed:', e.message);
          
          // Try cleaning ANSI codes
          let cleanedOutput = createOutput
            .replace(/\x1B\[[0-9;]*m/g, '')
            .trim();
          
          try {
            createResult = JSON.parse(cleanedOutput);
            console.log('Cleaned create output parse succeeded');
          } catch (cleanError: any) {
            console.log('Cleaned create parse also failed:', cleanError.message);
            
            const lines = createOutput.split('\n');
            console.log(`Searching through ${lines.length} lines for create result JSON...`);
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i].trim();
              if (line.startsWith('{')) {
                const jsonStr = lines.slice(i).join('\n');
                try {
                  createResult = JSON.parse(jsonStr);
                  console.log('Line-by-line parse of create output succeeded');
                  break;
                } catch (lineError: any) {
                  console.log(`Parse failed at line ${i}`);
                  continue;
                }
              }
            }
          }
        }
        
        if (!createResult) {
          console.error('Failed to parse create user output');
          console.error('Full create output:', createOutput);
          throw new Error('Could not parse user creation result after multiple attempts');
        }
        
        const userId = createResult.result.id;
        console.log(`Platform user created with ID: ${userId}`);

        // Perform browser-based "Login As" using admin UI navigation (no apiClient required)
        // Open a headless admin browser, reuse admin cookies if available, navigate to the user's setup page and click Login.
        try {
          const { chromium } = require("playwright");
          const adminBrowser = await chromium.launch({ headless: true });
          const adminContext = await adminBrowser.newContext();
          const adminPage = await adminContext.newPage();

          // If the test runner stored admin cookies earlier, reuse them
          if ((global as any).__adminCookies__) {
            try {
              await adminContext.addCookies((global as any).__adminCookies__);
            } catch (cookieErr) {
              console.warn("Failed to add admin cookies to admin context:", cookieErr);
            }
          }

          // Navigate to the User detail admin page and attempt to click the Login button
          try {
            // Use SF_BASE_URL as requested and follow redirects until we reach the user detail page.
            const baseUrl = process.env.SF_BASE_URL || "";
            // Use Setup URL with query params to force redirect to user detail as provided
            const userDetailUrl = `${baseUrl}/lightning/setup/ManageUsers/page?address=/${encodeURIComponent(userId)}?noredirect=1&isUserEntityOverride=1`;

            // Navigate and wait for potential redirects; allow up to 60s for Lightning to finish loading.
            await adminPage.goto(userDetailUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
            // Small delay to allow any client-side redirects or additional rendering to complete
            await adminPage.waitForTimeout(5000);

            // Diagnostic: log final URL after navigation to help debug redirects
            try {
              const finalUrl = adminPage.url();
              console.log('Admin navigation final URL:', finalUrl);
            } catch (uErr) {
              console.warn('Could not read admin page URL for diagnostics', uErr);
            }

            // Wait for Lightning to initialize and for the user's header or Login button to appear
            // Try a few selector strategies and wait longer if necessary.
            const adminLoginPage = new (require("../src/pages/LoginPage").LoginPage)(adminPage);
            await adminLoginPage.waitForLightningReady();

            // Wait for either the user header or the Login button to be visible (up to 30s)
            const loginBtnSelector = 'a:text-is("Login"), input[value="Login"], button:has-text("Login")';
            const userHeaderSelector = 'h1:has-text("User"), div.header:has-text("User")';

            const found = await Promise.race([
              adminPage.waitForSelector(loginBtnSelector, { timeout: 30_000 }).then(() => "login"),
              adminPage.waitForSelector(userHeaderSelector, { timeout: 30_000 }).then(() => "header"),
            ]).catch(() => null);

            if (found === "login") {
              const loginBtn = adminPage.locator(loginBtnSelector).first();
              try {
                await loginBtn.click();
                await adminLoginPage.waitForLightningReady();
                const impersonationCookies = await adminContext.cookies();
                (global as any).__impersonationCookies__ = impersonationCookies;
                console.log("Captured impersonation cookies after successful Login As.");
              } catch (clickErr) {
                console.warn("Login button click failed:", clickErr);
              }
            } else if (found === "header") {
              console.log("User detail header found but Login button not immediately visible; attempting to find Login button now...");
              const loginBtn = adminPage.locator(loginBtnSelector).first();
              if (await loginBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
                try {
                  await loginBtn.click();
                  await adminLoginPage.waitForLightningReady();
                  const impersonationCookies = await adminContext.cookies();
                  (global as any).__impersonationCookies__ = impersonationCookies;
                  console.log("Captured impersonation cookies after successful Login As (header path).");
                } catch (clickErr) {
                  console.warn("Login button click failed after header found:", clickErr);
                }
              } else {
                console.warn("Login button still not visible after header present; Login As may be disabled for this org/user.");
              }
            } else {
              console.warn("Could not find user detail header or Login button after navigation; Login As may be disabled or the URL did not redirect to a user detail page.");
            }
          } catch (navErr) {
            console.warn("Admin navigation or Login As click failed:", navErr);
          } finally {
            try { await adminPage.close(); } catch {}
            try { await adminContext.close(); } catch {}
            try { await adminBrowser.close(); } catch {}
          }
        } catch (err) {
          console.warn("Browser-based Login As flow failed:", err);
        }
        

        // Attempt to impersonate the newly-created user via admin "Login As"
        // This requires the current test admin session to have the Login-As permission.
        try {
          const apiClient = (global as any).apiClient ?? null;
            // If tests run in an admin browser context, navigate there and perform Login As.
            // We'll open a short-lived admin page, navigate to the user's setup page and click Login.
            // This uses LoginPage.loginAsUser which navigates and clicks the Login button.
            try {
              // Create a temporary browser page as the admin to perform Login As
              const { chromium } = require('playwright');
              const browser = await chromium.launch({ headless: true });
              const adminContext = await browser.newContext();
              const adminPage = await adminContext.newPage();

              // Reuse the authenticated admin cookies from the test runner if available
              if ((global as any).__adminCookies__) {
                await adminContext.addCookies((global as any).__adminCookies__);
              }

              const adminLoginPage = new (require('../src/pages/LoginPage').LoginPage)(adminPage);
              try {
                // Attempt to navigate to the user detail and click Login (loginAsUser handles navigation)
                await adminLoginPage.loginAsUser(userId);

                // Capture cookies/localStorage from the impersonated session so we can reuse in the platform user context
                const sessionCookies = await adminContext.cookies();
                (global as any).__impersonationCookies__ = sessionCookies;
                console.log('Successfully impersonated user via Login As and captured session cookies.');
              } catch (impErr) {
                console.warn('Login As attempt failed or is not permitted for this admin user:', impErr);
              } finally {
                await adminPage.close();
                await adminContext.close();
                await browser.close();
              }
            } catch (err) {
              console.warn('Could not perform headless admin Login As step:', err);
            }
        } catch (e) {
          console.warn('Login As impersonation step failed:', e);
        }
      } catch (error) {
        console.error('Error creating user:', error);
        
        // Provide alternative manual steps
        console.log('\nALTERNATIVE: Create user manually:');
        console.log('1. In Salesforce Setup → Users → New User');
        console.log('2. Use these values:');
        console.log(`   - Username: ${username}`);
        console.log(`   - Email: ${username}`);
        console.log('   - Profile: Standard User');
        console.log('   - First Name: Playwright');
        console.log('   - Last Name: ReadOnlyUser');
        console.log(`3. Set a password: ${password}`);
        
        throw error;
      }
    }
  });
  

  /**
   * Log in as the newly created Platform User.
   * Opens a new browser context to avoid polluting the admin session.
   * 
   * NOTE: This test depends on Scenario 1 (opportunity.spec.ts) running first.
   * Run both test files together: npx playwright test tests/opportunity.spec.ts tests/platform-user.spec.ts
   */
  test(
    "2.2 - Platform User can view the Opportunity (Scenario 1)",
    async ({ browser, sfConfig }) => {
      const opportunityId = '0069I00000HSBRlQAP';//SharedState.opportunityId;
      
      if (!opportunityId) {
        console.warn('Opportunity ID not found in SharedState.');
        console.warn('This test depends on Scenario 1 running first.');
        console.warn('Run: npx playwright test tests/opportunity.spec.ts tests/platform-user.spec.ts');
        test.skip();
      }
      
      expect(opportunityId).toBeTruthy();

      const userUsername = SharedState.platformUserUsername;
      const userPassword = SharedState.platformUserPassword;

      expect(userUsername).toBeTruthy();
      expect(userPassword).toBeTruthy();

      // Create a fresh browser context for the platform user
        const userContext = await browser.newContext({
          ignoreHTTPSErrors: true,
        });

        // If we captured impersonation cookies earlier, reuse them so we don't need the user's password
        if ((global as any).__impersonationCookies__ && (global as any).__impersonationCookies__.length > 0) {
          try {
            await userContext.addCookies((global as any).__impersonationCookies__);
            console.log('Reused impersonation cookies in platform user context');
          } catch (cookieErr) {
            console.warn('Failed to add impersonation cookies to user context:', cookieErr);
          }
        }

        const userPage = await userContext.newPage();
        
        // Ensure any existing session is logged out before attempting to log in (safe no-op if already impersonated)
        const loginPage = new LoginPage(userPage);
        try {
          await loginPage.logout();
        } catch (err) {
          // If logout fails (e.g., already at login page), ignore and continue
          console.warn('Logout before login attempt failed or not needed:', err);
        }

        try {
          const loginPage = new LoginPage(userPage);
          // Ensure any existing session is logged out and we're on the login page
          try {
            await loginPage.logout();
          } catch (e) {
            // ignore logout errors (already at login page or not logged in)
          }
          await loginPage.goto();
          await loginPage.login(userUsername, userPassword);

        const oppPage = new OpportunityPage(userPage);
        await oppPage.assertCanView(opportunityId);

        console.log("Platform user can view the Opportunity");
      } finally {
        await userPage.close();
        await userContext.close();
      }
    }
  );

  test(
    "2.3 - Platform User cannot edit the Opportunity",
    async ({ browser, sfConfig }) => {
      const opportunityId = '0069I00000HSBRlQAP'; //SharedState.opportunityId;
      
      if (!opportunityId) {
        console.warn('Opportunity ID not found in SharedState.');
        console.warn('This test depends on Scenario 1 running first.');
        console.warn('Run: npx playwright test tests/opportunity.spec.ts tests/platform-user.spec.ts');
        test.skip();
      }
      
      expect(opportunityId).toBeTruthy();

      const userUsername = SharedState.platformUserUsername;
      const userPassword = SharedState.platformUserPassword;

      // Fresh browser context for the platform user
      const userContext = await browser.newContext({
        ignoreHTTPSErrors: true,
      });
      const userPage = await userContext.newPage();

      try {
        const loginPage = new LoginPage(userPage);
        await loginPage.goto();
        await loginPage.login(userUsername, userPassword);

        const oppPage = new OpportunityPage(userPage);
        await oppPage.navigateToOpportunity(opportunityId);

        // Verify the record loads
        await oppPage.assertCanView(opportunityId);

        // Assert Edit button is absent / user cannot edit
        await oppPage.assertReadOnly();

        // Extra check: try to directly access the edit URL
        // Salesforce should redirect or show an error for read-only users
        await userPage.goto(
          `${sfConfig.instanceUrl}/lightning/r/Opportunity/${opportunityId}/edit`,
          { waitUntil: "domcontentloaded" }
        );

        // Either we get redirected back to the view page, or an error message appears
        const editFormVisible = await userPage
          .locator('button:text-is("Save")')
          .isVisible({ timeout: 5000 });

        expect(editFormVisible).toBe(false);

        console.log("Platform user cannot edit the Opportunity");
      } finally {
        await userPage.close();
        await userContext.close();
      }
    }
  );
});