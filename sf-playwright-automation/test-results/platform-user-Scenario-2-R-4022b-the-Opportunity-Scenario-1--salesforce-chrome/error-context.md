# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: platform-user.spec.ts >> Scenario 2: Read-Only Platform User Access >> 2.2 - Platform User can view the Opportunity (Scenario 1)
- Location: tests\platform-user.spec.ts:394:7

# Error details

```
Error: expect(received).toBeTruthy()

Received: ""
```

# Page snapshot

```yaml
- generic [active]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - link "Skip to Navigation" [ref=e4] [cursor=pointer]:
        - /url: javascript:void(0);
      - link "Skip to Main Content" [ref=e5] [cursor=pointer]:
        - /url: javascript:void(0);
      - generic [ref=e6]:
        - button "Search" [ref=e12]:
          - img [ref=e14]
          - text: Search...
        - navigation "Global Header" [ref=e17]:
          - list [ref=e18]:
            - listitem [ref=e19]
    - generic [ref=e23]:
      - generic [ref=e26]:
        - generic [ref=e28]:
          - navigation "App" [ref=e29]:
            - button "App Launcher" [ref=e31] [cursor=pointer]:
              - generic [ref=e42]: App Launcher
          - heading "Sales" [level=1] [ref=e43]:
            - generic "Sales" [ref=e44]
        - navigation "Global" [ref=e47]:
          - list [ref=e48]:
            - listitem [ref=e49]:
              - link "Home" [ref=e50] [cursor=pointer]:
                - /url: /lightning/page/home
                - generic [ref=e51]: Home
            - listitem [ref=e52]:
              - link "Analytics" [ref=e53] [cursor=pointer]:
                - /url: /lightning/page/analytics
                - generic [ref=e54]: Analytics
            - listitem [ref=e55]:
              - link "Opportunities" [ref=e56] [cursor=pointer]:
                - /url: /lightning/o/Opportunity/home
                - generic [ref=e57]: Opportunities
              - button "Opportunities List" [ref=e61] [cursor=pointer]:
                - img [ref=e65]
                - generic [ref=e68]: Opportunities List
            - listitem [ref=e69]:
              - link "Leads" [ref=e70] [cursor=pointer]:
                - /url: /lightning/o/Lead/home
                - generic [ref=e71]: Leads
              - button "Leads List" [ref=e75] [cursor=pointer]:
                - img [ref=e79]
                - generic [ref=e82]: Leads List
            - listitem [ref=e83]:
              - link "Tasks" [ref=e84] [cursor=pointer]:
                - /url: /lightning/o/Task/home
                - generic [ref=e85]: Tasks
              - button "Tasks List" [ref=e89] [cursor=pointer]:
                - img [ref=e93]
                - generic [ref=e96]: Tasks List
            - listitem [ref=e97]:
              - link "Files" [ref=e98] [cursor=pointer]:
                - /url: /lightning/o/ContentDocument/home
                - generic [ref=e99]: Files
              - button "Files List" [ref=e103] [cursor=pointer]:
                - img [ref=e107]
                - generic [ref=e110]: Files List
            - listitem [ref=e111]:
              - link "Accounts" [ref=e112] [cursor=pointer]:
                - /url: /lightning/o/Account/home
                - generic [ref=e113]: Accounts
              - button "Accounts List" [ref=e117] [cursor=pointer]:
                - img [ref=e121]
                - generic [ref=e124]: Accounts List
            - listitem [ref=e125]:
              - link "Contacts" [ref=e126] [cursor=pointer]:
                - /url: /lightning/o/Contact/home
                - generic [ref=e127]: Contacts
              - button "Contacts List" [ref=e131] [cursor=pointer]:
                - img [ref=e135]
                - generic [ref=e138]: Contacts List
            - listitem [ref=e139]:
              - link "Campaigns" [ref=e140] [cursor=pointer]:
                - /url: /lightning/o/Campaign/home
                - generic [ref=e141]: Campaigns
              - button "Campaigns List" [ref=e145] [cursor=pointer]:
                - img [ref=e149]
                - generic [ref=e152]: Campaigns List
            - listitem [ref=e153]:
              - link "Dashboards" [ref=e154] [cursor=pointer]:
                - /url: /lightning/o/Dashboard/home
                - generic [ref=e155]: Dashboards
              - button "Dashboards List" [ref=e159] [cursor=pointer]:
                - img [ref=e163]
                - generic [ref=e166]: Dashboards List
            - listitem [ref=e167]:
              - link "Reports" [ref=e168] [cursor=pointer]:
                - /url: /lightning/o/Report/home
                - generic [ref=e169]: Reports
              - button "Reports List" [ref=e173] [cursor=pointer]:
                - img [ref=e177]
                - generic [ref=e180]: Reports List
            - listitem [ref=e181]:
              - link "Chatter" [ref=e182] [cursor=pointer]:
                - /url: /lightning/page/chatter
                - generic [ref=e183]: Chatter
            - listitem [ref=e184]:
              - button "Show more navigation items" [ref=e186] [cursor=pointer]:
                - generic [ref=e187]: More
                - img [ref=e191]
                - generic [ref=e194]: Show more navigation items
            - listitem [ref=e195]:
              - button "Edit nav items" [ref=e197] [cursor=pointer]:
                - img [ref=e199]
                - generic [ref=e202]: Edit nav items
      - main [ref=e204]
  - generic:
    - status
```

# Test source

```ts
  311 |             } else {
  312 |               console.warn("Could not find user detail header or Login button after navigation; Login As may be disabled or the URL did not redirect to a user detail page.");
  313 |             }
  314 |           } catch (navErr) {
  315 |             console.warn("Admin navigation or Login As click failed:", navErr);
  316 |           } finally {
  317 |             try { await adminPage.close(); } catch {}
  318 |             try { await adminContext.close(); } catch {}
  319 |             try { await adminBrowser.close(); } catch {}
  320 |           }
  321 |         } catch (err) {
  322 |           console.warn("Browser-based Login As flow failed:", err);
  323 |         }
  324 |         
  325 | 
  326 |         // Attempt to impersonate the newly-created user via admin "Login As"
  327 |         // This requires the current test admin session to have the Login-As permission.
  328 |         try {
  329 |           const apiClient = (global as any).apiClient ?? null;
  330 |             // If tests run in an admin browser context, navigate there and perform Login As.
  331 |             // We'll open a short-lived admin page, navigate to the user's setup page and click Login.
  332 |             // This uses LoginPage.loginAsUser which navigates and clicks the Login button.
  333 |             try {
  334 |               // Create a temporary browser page as the admin to perform Login As
  335 |               const { chromium } = require('playwright');
  336 |               const browser = await chromium.launch({ headless: true });
  337 |               const adminContext = await browser.newContext();
  338 |               const adminPage = await adminContext.newPage();
  339 | 
  340 |               // Reuse the authenticated admin cookies from the test runner if available
  341 |               if ((global as any).__adminCookies__) {
  342 |                 await adminContext.addCookies((global as any).__adminCookies__);
  343 |               }
  344 | 
  345 |               const adminLoginPage = new (require('../src/pages/LoginPage').LoginPage)(adminPage);
  346 |               try {
  347 |                 // Attempt to navigate to the user detail and click Login (loginAsUser handles navigation)
  348 |                 await adminLoginPage.loginAsUser(userId);
  349 | 
  350 |                 // Capture cookies/localStorage from the impersonated session so we can reuse in the platform user context
  351 |                 const sessionCookies = await adminContext.cookies();
  352 |                 (global as any).__impersonationCookies__ = sessionCookies;
  353 |                 console.log('Successfully impersonated user via Login As and captured session cookies.');
  354 |               } catch (impErr) {
  355 |                 console.warn('Login As attempt failed or is not permitted for this admin user:', impErr);
  356 |               } finally {
  357 |                 await adminPage.close();
  358 |                 await adminContext.close();
  359 |                 await browser.close();
  360 |               }
  361 |             } catch (err) {
  362 |               console.warn('Could not perform headless admin Login As step:', err);
  363 |             }
  364 |         } catch (e) {
  365 |           console.warn('Login As impersonation step failed:', e);
  366 |         }
  367 |       } catch (error) {
  368 |         console.error('Error creating user:', error);
  369 |         
  370 |         // Provide alternative manual steps
  371 |         console.log('\nALTERNATIVE: Create user manually:');
  372 |         console.log('1. In Salesforce Setup → Users → New User');
  373 |         console.log('2. Use these values:');
  374 |         console.log(`   - Username: ${username}`);
  375 |         console.log(`   - Email: ${username}`);
  376 |         console.log('   - Profile: Standard User');
  377 |         console.log('   - First Name: Playwright');
  378 |         console.log('   - Last Name: ReadOnlyUser');
  379 |         console.log(`3. Set a password: ${password}`);
  380 |         
  381 |         throw error;
  382 |       }
  383 |     }
  384 |   });
  385 |   
  386 | 
  387 |   /**
  388 |    * Log in as the newly created Platform User.
  389 |    * Opens a new browser context to avoid polluting the admin session.
  390 |    * 
  391 |    * NOTE: This test depends on Scenario 1 (opportunity.spec.ts) running first.
  392 |    * Run both test files together: npx playwright test tests/opportunity.spec.ts tests/platform-user.spec.ts
  393 |    */
  394 |   test(
  395 |     "2.2 - Platform User can view the Opportunity (Scenario 1)",
  396 |     async ({ browser, sfConfig }) => {
  397 |       const opportunityId = '0069I00000HSBRlQAP';//SharedState.opportunityId;
  398 |       
  399 |       if (!opportunityId) {
  400 |         console.warn('Opportunity ID not found in SharedState.');
  401 |         console.warn('This test depends on Scenario 1 running first.');
  402 |         console.warn('Run: npx playwright test tests/opportunity.spec.ts tests/platform-user.spec.ts');
  403 |         test.skip();
  404 |       }
  405 |       
  406 |       expect(opportunityId).toBeTruthy();
  407 | 
  408 |       const userUsername = SharedState.platformUserUsername;
  409 |       const userPassword = SharedState.platformUserPassword;
  410 | 
> 411 |       expect(userUsername).toBeTruthy();
      |                            ^ Error: expect(received).toBeTruthy()
  412 |       expect(userPassword).toBeTruthy();
  413 | 
  414 |       // Create a fresh browser context for the platform user
  415 |         const userContext = await browser.newContext({
  416 |           ignoreHTTPSErrors: true,
  417 |         });
  418 | 
  419 |         // If we captured impersonation cookies earlier, reuse them so we don't need the user's password
  420 |         if ((global as any).__impersonationCookies__ && (global as any).__impersonationCookies__.length > 0) {
  421 |           try {
  422 |             await userContext.addCookies((global as any).__impersonationCookies__);
  423 |             console.log('Reused impersonation cookies in platform user context');
  424 |           } catch (cookieErr) {
  425 |             console.warn('Failed to add impersonation cookies to user context:', cookieErr);
  426 |           }
  427 |         }
  428 | 
  429 |         const userPage = await userContext.newPage();
  430 |         
  431 |         // Ensure any existing session is logged out before attempting to log in (safe no-op if already impersonated)
  432 |         const loginPage = new LoginPage(userPage);
  433 |         try {
  434 |           await loginPage.logout();
  435 |         } catch (err) {
  436 |           // If logout fails (e.g., already at login page), ignore and continue
  437 |           console.warn('Logout before login attempt failed or not needed:', err);
  438 |         }
  439 | 
  440 |         try {
  441 |           const loginPage = new LoginPage(userPage);
  442 |           // Ensure any existing session is logged out and we're on the login page
  443 |           try {
  444 |             await loginPage.logout();
  445 |           } catch (e) {
  446 |             // ignore logout errors (already at login page or not logged in)
  447 |           }
  448 |           await loginPage.goto();
  449 |           await loginPage.login(userUsername, userPassword);
  450 | 
  451 |         const oppPage = new OpportunityPage(userPage);
  452 |         await oppPage.assertCanView(opportunityId);
  453 | 
  454 |         console.log("Platform user can view the Opportunity");
  455 |       } finally {
  456 |         await userPage.close();
  457 |         await userContext.close();
  458 |       }
  459 |     }
  460 |   );
  461 | 
  462 |   test(
  463 |     "2.3 - Platform User cannot edit the Opportunity",
  464 |     async ({ browser, sfConfig }) => {
  465 |       const opportunityId = '0069I00000HSBRlQAP'; //SharedState.opportunityId;
  466 |       
  467 |       if (!opportunityId) {
  468 |         console.warn('Opportunity ID not found in SharedState.');
  469 |         console.warn('This test depends on Scenario 1 running first.');
  470 |         console.warn('Run: npx playwright test tests/opportunity.spec.ts tests/platform-user.spec.ts');
  471 |         test.skip();
  472 |       }
  473 |       
  474 |       expect(opportunityId).toBeTruthy();
  475 | 
  476 |       const userUsername = SharedState.platformUserUsername;
  477 |       const userPassword = SharedState.platformUserPassword;
  478 | 
  479 |       // Fresh browser context for the platform user
  480 |       const userContext = await browser.newContext({
  481 |         ignoreHTTPSErrors: true,
  482 |       });
  483 |       const userPage = await userContext.newPage();
  484 | 
  485 |       try {
  486 |         const loginPage = new LoginPage(userPage);
  487 |         await loginPage.goto();
  488 |         await loginPage.login(userUsername, userPassword);
  489 | 
  490 |         const oppPage = new OpportunityPage(userPage);
  491 |         await oppPage.navigateToOpportunity(opportunityId);
  492 | 
  493 |         // Verify the record loads
  494 |         await oppPage.assertCanView(opportunityId);
  495 | 
  496 |         // Assert Edit button is absent / user cannot edit
  497 |         await oppPage.assertReadOnly();
  498 | 
  499 |         // Extra check: try to directly access the edit URL
  500 |         // Salesforce should redirect or show an error for read-only users
  501 |         await userPage.goto(
  502 |           `${sfConfig.instanceUrl}/lightning/r/Opportunity/${opportunityId}/edit`,
  503 |           { waitUntil: "domcontentloaded" }
  504 |         );
  505 | 
  506 |         // Either we get redirected back to the view page, or an error message appears
  507 |         const editFormVisible = await userPage
  508 |           .locator('button:text-is("Save")')
  509 |           .isVisible({ timeout: 5000 });
  510 | 
  511 |         expect(editFormVisible).toBe(false);
```