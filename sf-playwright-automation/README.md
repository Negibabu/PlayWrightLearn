# Salesforce Lightning Playwright Automation Framework

A production-grade, TypeScript-first test automation framework for Salesforce Lightning Experience using Playwright. Covers two end-to-end scenarios: Opportunity creation/validation and read-only Platform User access control.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Project Structure](#project-structure)
4. [Configuration](#configuration)
5. [Running Tests](#running-tests)
6. [Framework Design Decisions](#framework-design-decisions)
7. [Salesforce Configuration Persistence](#salesforce-configuration-persistence)
8. [Handling Salesforce Lightning Challenges](#handling-salesforce-lightning-challenges)
9. [Known Limitations](#known-limitations)
10. [What I Would Improve With More Time](#what-i-would-improve-with-more-time)

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | ≥ 18.x | LTS recommended |
| npm | ≥ 9.x | Bundled with Node |
| Salesforce CLI (`sf`) | ≥ 2.x | `npm i -g @salesforce/cli` |
| Salesforce Dev Hub | — | Required for scratch org creation |

---

## Quick Start

### Option A: Scratch Org (Recommended for CI/CD)

```bash
# 1. Clone the repo
git clone <repo-url>
cd sf-playwright-automation

# 2. Install dependencies
npm install

# 3. Install Playwright browsers
npx playwright install chromium

# 4. Authenticate your Dev Hub (one-time)
sf org login web --set-default-dev-hub --alias DevHub

# 5. Create scratch org, push metadata, write .env.local
npm run setup:org

# 6. Run all tests
npm test
```

### Option B: Existing Org

```bash
# 1. Install deps
npm install
npx playwright install chromium

# 2. Copy and fill in the environment file
cp .env.example .env.local
# Edit .env.local with your org's URL, username, and password

# 3. Manually deploy metadata to your org
sf project deploy start --target-org <your-org-alias>

# 4. Run tests
npm test
```

---

## Project Structure

```
sf-playwright-automation/
│
├── src/
│   ├── pages/                     # Page Object Models
│   │   ├── BaseLightningPage.ts   # Shared Lightning helpers (spinners, toasts, etc.)
│   │   ├── LoginPage.ts           # Login and session management
│   │   ├── AccountPage.ts         # Account record interactions
│   │   ├── OpportunityPage.ts     # Opportunity CRUD and validation
│   │   └── UserManagementPage.ts  # User creation and permission assignment
│   │
│   ├── utils/
│   │   └── SalesforceApiClient.ts # REST API client for data setup/teardown
│   │
│   ├── fixtures/
│   │   └── salesforce.fixtures.ts # Playwright fixture extensions + shared state
│   │
│   └── config/
│       ├── environment.ts         # Typed env var access with validation
│       ├── global-setup.ts        # Pre-suite setup (directories, etc.)
│       └── global-teardown.ts     # Post-suite cleanup
│
├── tests/
│   ├── auth.setup.ts              # Authentication setup (runs before all specs)
│   ├── scenario1/
│   │   └── opportunity.spec.ts    # Opportunity creation + validation
│   └── scenario2/
│       └── platform-user.spec.ts  # Platform User read-only access
│
├── force-app/main/default/        # Salesforce metadata (deployed to org)
│   ├── objects/Opportunity/
│   │   └── fields/
│   │       └── Quantity__c.field-meta.xml
│   ├── layouts/
│   │   └── Opportunity-Opportunity_Layout.layout-meta.xml
│   └── permissionsets/
│       └── Opportunity_Read_Only.permissionset-meta.xml
│
├── scripts/
│   └── setup-scratch-org.ts       # Full org provisioning script
│
├── config/
│   └── project-scratch-def.json   # Scratch org shape definition
│
├── playwright.config.ts
├── tsconfig.json
├── sfdx-project.json
├── .env.example
└── README.md
```

---

## Configuration

All configuration flows through environment variables. The framework never hardcodes credentials.

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SF_INSTANCE_URL` | ✅ | e.g. `https://myorg.my.salesforce.com` |
| `SF_ADMIN_USERNAME` | ✅ | Admin user's login email |
| `SF_ADMIN_PASSWORD` | ✅ | Admin user's password |
| `SF_SECURITY_TOKEN` | — | Appended to password for non-trusted IPs |
| `SF_API_VERSION` | — | Default: `59.0` |
| `TEST_ACCOUNT_NAME` | — | Default: `A1` |
| `TEST_OPPORTUNITY_NAME` | — | Default: `A1 Q1 2025 Opportunity` |
| `TEST_CLOSE_DATE` | — | Default: `12/31/2025` |
| `TEST_STAGE_NAME` | — | Default: `Prospecting` |
| `TEST_AMOUNT` | — | Default: `50000` |
| `TEST_QUANTITY` | — | Default: `10` |

Copy `.env.example` → `.env.local` to get started. `.env.local` is gitignored.

---

## Running Tests

```bash
# All tests
npm test

# Scenario 1 only (Opportunity)
npm run test:scenario1

# Scenario 2 only (Platform User)
npm run test:scenario2

# Headed mode (see the browser)
npm run test:headed

# Debug mode (step through with inspector)
npm run test:debug

# View HTML report after a run
npm run test:report
```

### CI/CD

The framework supports CI out of the box. Set your secrets as environment variables in your CI system (GitHub Actions, etc.):

```yaml
# .github/workflows/playwright.yml (example)
env:
  SF_INSTANCE_URL: ${{ secrets.SF_INSTANCE_URL }}
  SF_ADMIN_USERNAME: ${{ secrets.SF_ADMIN_USERNAME }}
  SF_ADMIN_PASSWORD: ${{ secrets.SF_ADMIN_PASSWORD }}
```

For scratch org creation in CI:

```yaml
- name: Setup scratch org
  run: npm run setup:org
  env:
    SFDX_AUTH_URL: ${{ secrets.SFDX_AUTH_URL }}
```

---

## Framework Design Decisions

### 1. Page Object Model (POM)

Each Salesforce page/feature area has a dedicated Page Object class that inherits from `BaseLightningPage`. This provides:

- **Single Responsibility**: Page logic lives in the page class, not the test.
- **Reusability**: Tests across scenarios share the same `AccountPage`, `OpportunityPage`, etc.
- **Resilience**: Selector changes only need updating in one place.

### 2. `BaseLightningPage` — Shared Lightning Primitives

All Lightning-specific complexity (spinner detection, toast handling, iframe navigation, lookup fields, comboboxes) is centralised in `BaseLightningPage`. Test authors never deal with `slds-spinner` selectors or `lightning-base-combobox-item` directly.

Key capabilities:
- `waitForLightningReady()` — multi-phase readiness check (DOM + spinners + LWC hydration delay)
- `waitForToast()` / `assertSuccessToast()` — ephemeral toast capture
- `fillFieldByLabel()` — handles `lightning-input`, `lightning-textarea`, classic `<input>`
- `selectPicklistByLabel()` — handles `lightning-combobox`, `lightning-select`, and native `<select>`
- `fillLookupField()` — search-and-select for relationship fields
- `setDateField()` — handles Lightning date pickers and their quirks

### 3. Dual-Layer Data Operations (UI + API)

- **UI layer** is used for the actual test scenarios (creating accounts, opportunities, validating pages) — this is what verifies the user experience.
- **API layer** (`SalesforceApiClient`) is used for test data setup that doesn't need UI validation: creating Platform Users, assigning permission sets, finding existing records. This makes setup 10–100× faster and more reliable than driving the Setup UI.

### 4. Authentication State Persistence

Playwright's `storageState` captures cookies and localStorage after the first login and reuses them for every subsequent test. This avoids a full login flow on every spec file, cutting test suite runtime significantly.

```
tests/auth.setup.ts → playwright/.auth/admin.json → reused by all specs
```

For Scenario 2's Platform User, a fresh `browser.newContext()` is created to isolate the user's session from the admin session. No shared state between contexts.

### 5. Serial Test Execution

Salesforce tests are inherently stateful — Scenario 2 depends on the Opportunity created in Scenario 1. Tests within each scenario use `test.describe.configure({ mode: 'serial' })` to enforce ordering. Cross-scenario state is passed via `SharedState` (process.env-backed), which works with Playwright's single-worker mode.

### 6. Environment-Aware Configuration

`src/config/environment.ts` provides strongly-typed access to all configuration. `requireEnv()` fails fast with a clear message if a required variable is missing. `optionalEnv()` provides sensible defaults. No `process.env.FOO!` scattered through test files.

### 7. No Magic Waits

The framework does **not** use `page.waitForTimeout()` as a synchronisation mechanism except for the minimum 300–500ms LWC hydration delay (which is unavoidable — Lightning Web Components have asynchronous rendering). All other waits are condition-based (`waitFor`, `expect().toBeVisible()`).

---

## Salesforce Configuration Persistence

All configuration changes are stored as Salesforce DX metadata in `force-app/` and are automatically deployed whenever a new scratch org is created via `npm run setup:org`.

### What Gets Deployed

| Metadata | File | Purpose |
|---|---|---|
| Custom Field | `objects/Opportunity/fields/Quantity__c.field-meta.xml` | Adds Quantity (Number) to Opportunity |
| Page Layout | `layouts/Opportunity-Opportunity_Layout.layout-meta.xml` | Places Quantity on the standard Opportunity layout |
| Permission Set | `permissionsets/Opportunity_Read_Only.permissionset-meta.xml` | Read-only access to Opportunity for Platform Users |

### How It Works

1. `sfdx-project.json` defines `force-app` as the package directory.
2. `config/project-scratch-def.json` defines the scratch org shape (edition, features, settings).
3. `scripts/setup-scratch-org.ts` runs `sf project deploy start` after org creation.
4. The org is always in a known, reproducible state after setup — **zero manual steps**.

### Idempotency

The setup script is idempotent:
- If the org alias already exists, `--reuse-existing` skips creation.
- `sf project deploy start` is a push/deploy — it's safe to re-run.
- The Playwright test for Account creation checks for existence before creating.

---

## Handling Salesforce Lightning Challenges

### ⚡ Lightning UI Rendering Delays

**Problem**: Lightning Web Components render asynchronously. A page may be "loaded" from the browser's perspective but have empty content while LWC wire adapters are still fetching data.

**Solution**: `waitForLightningReady()` implements a three-phase wait:
1. `waitForLoadState('domcontentloaded')` — HTML is parsed
2. `waitForSpinnersToDisappear()` — all `slds-spinner` variants are gone
3. 500ms minimum buffer for LWC hydration — unavoidable, but bounded

### 🌀 Dynamic DOM Elements

**Problem**: Salesforce Lightning generates deeply nested, dynamically-keyed DOM elements with unstable attributes (`data-key`, generated IDs).

**Solution**: Selectors in `BaseLightningPage` use stable anchors:
- `label` text content (`:text-is()`)
- ARIA roles (`[role="option"]`)
- SLDS class names (stable across versions)
- XPath `normalize-space()` for whitespace-tolerant label matching
- Multiple fallback selectors tried in sequence

### 🍞 Toast Messages

**Problem**: Salesforce's success/error toasts auto-dismiss after ~3 seconds. Standard `expect().toBeVisible()` can miss them in slow CI environments.

**Solution**: `waitForToast()` sets up a `waitFor({ state: 'visible' })` call before the action completes, capturing the toast within its display window. The toast assertion is always placed immediately after the triggering action.

### 🔄 Asynchronous Page Behaviour

**Problem**: Salesforce's navigation uses a custom router — `page.goto()` resolves before the Lightning app has rendered its content.

**Solution**: Every navigation is followed by `waitForLightningReady()`. Additionally, `page.waitForURL(/\/lightning\//)` verifies the SPA router has committed to the correct route.

### 🖼️ Setup Iframe

**Problem**: Salesforce Setup pages (User management, Profile editor) render inside a Visualforce iframe embedded in the Lightning shell.

**Solution**: `UserManagementPage.getSetupIframe()` detects and returns the correct frame context. All interactions in Setup pages operate on the iframe's `FrameLocator`, not the top-level page.

### 🔒 Login-as / Multi-Session

**Problem**: Testing the Platform User's view requires switching sessions without losing the admin session.

**Solution**: `browser.newContext()` creates a completely isolated browser context for the Platform User. No cookies or localStorage are shared. The admin session remains intact in the original context.

---

## Known Limitations

1. **Password reset in CI**: `sf org generate password` requires the `EnableSetPasswordInApi` scratch org feature, which is included in `project-scratch-def.json`. In some Dev Hub configurations this feature may be disabled.

2. **MFA**: If the org has MFA enforced for all users, the login flow will stall at the verification prompt. Scratch orgs do not enforce MFA by default; sandbox/production orgs may need a trusted IP range or a special test-automation profile with MFA waiver.

3. **Permission Set Licensing**: The `Opportunity_Read_Only` permission set uses `PlatformAppSubscription` license. If the org does not have Platform App licenses, the permission set metadata will deploy but may not be assignable. In that case, the Standard Platform User profile's default object permissions apply.

4. **Org-Specific Layouts**: The layout metadata deploys the standard Opportunity layout. If the target org uses a custom record type with a different layout assignment, the Quantity field will appear in the object but not on the user-visible layout. An additional RecordTypeMapping deployment would be required.

5. **Shared state between scenarios**: `SharedState` uses `process.env` to pass record IDs between test files. This works with `workers: 1` but breaks with parallel workers. A file-based or database state store would be needed for parallelisation.

6. **API OAuth**: The `SalesforceApiClient` uses the Username-Password OAuth flow, which requires either a trusted IP range or a connected app that allows the flow. Some orgs restrict this.

---

## What I Would Improve With More Time

### 1. Test Data Factory
Create a `TestDataFactory` class that uses the API to provision all test data before the UI tests run, and cleans it up after. This would decouple test prerequisites from test steps and allow proper parallelisation.

```typescript
// Desired DX
const factory = new TestDataFactory(apiClient);
const { accountId, opportunityId } = await factory.createScenario1Data();
test.afterAll(() => factory.cleanup());
```

### 2. Retry-Aware Selector Strategy
Implement a `SmartLocator` wrapper that automatically retries with alternative selectors when the primary one fails. This would make tests more resilient to minor Salesforce UI changes across patch releases.

### 3. Visual Regression Testing
Add `@playwright/test` screenshot comparisons for key views (Opportunity detail, Account related list) to catch unexpected UI regressions.

### 4. Parallel Test Execution
Refactor shared state from `process.env` to a file-based store (JSON) or lightweight SQLite DB, allowing tests to run with multiple workers for faster CI execution.

### 5. Allure Reporting
Replace the default Playwright HTML reporter with Allure for richer test history, trend analysis, and screenshot attachment support.

### 6. Custom Playwright Matchers
Add domain-specific matchers like `expect(oppPage).toHaveStage('Closed Won')` and `expect(oppPage).toBeReadOnly()` for more expressive, readable assertions.

### 7. Environment Profiles
Support multiple environment profiles (dev/staging/production) with a single switch rather than replacing `.env.local` entirely.

### 8. Retry Logic for Flaky Salesforce Operations
Wrap critical operations (lookup field search, picklist selection) in a retry helper that handles transient Lightning rendering failures gracefully.