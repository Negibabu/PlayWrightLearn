# Salesforce Lightning Playwright Automation Framework

A production-grade, TypeScript-first test automation framework for Salesforce Lightning Experience using Playwright. Covers two end-to-end scenarios: Opportunity creation/validation and read-only Platform User access control.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [What I Would Improve With More Time](#what-i-would-improve-with-more-time)

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
Existing Org

```bash
# 1. Install deps
npm install
npx playwright install chromium

# 2. Copy and fill in the environment file
# Edit .env.local with your scratch org's URL, username, and password

# 3. Manually deploy metadata to your org
sf project deploy start --target-org <your-org-alias>

# 4. Run tests
npx playwright test
```

## What I Would Improve With More Time

### 1. Test Data Factory
Create a `TestDataFactory` class that uses the API to provision all test data before the UI tests run, and cleans it up after.

### 2. Explore possibility of including Login As access in metadata deployment
Currently the new Quantity field, and FLS to Opportunity is enabled via metadata

### 3. Add Permission set for FLS
Instead of using Profiles, grant FLS via permission sets that can be deployed using metadata

### 4. Complete scenario 2
I successfully automated the creation of a user assigned to the Standard User profile using Playwright. With additional time, I would extend the script to log in as the newly created user and validate their read and edit access to Opportunity records, ensuring that permissions are enforced as expected.
