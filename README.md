# Playwright Automation — Truy Tìm Kho Báu

Automation framework for UI, API, and schema-driven mock contract tests using Playwright + TypeScript.

## Requirements

- Node.js 22+
- npm
- Playwright browsers:

```bash
npx playwright install --with-deps chromium
```

## Install

```bash
npm ci
```

## Main Commands

```bash
# TypeScript type-check
npm run typecheck

# Run every Playwright project
npm run test:all

# Run API tests against real backend
npm run test:api

# Run OpenAPI mock contract tests only (no browser, no backend call)
npm run test:api-mock

# Run UI tests without saved cookie
npm run test:ui

# Open Playwright interactive UI mode
npm run test:ui:mode

# Show latest HTML report
npm run report
```

## Playwright Projects

| Project | Purpose |
| --- | --- |
| `API-Tests` | Auth API and unauthorized API tests without storage state |
| `api-setup` | Creates authenticated API storage state |
| `API-Tests-co-cookie` | Authenticated API tests using `.auth/api-session.json` |
| `API-Mock-Contract` | Generates mock data from `openapi.json` and validates it against OpenAPI schemas |
| `UI-Tests-no-cookie` | UI tests without saved login state |
| `setup` | Creates UI storage state |
| `UI-Tests-co-cookie` | UI E2E tests using saved UI storage state |

## Environment Variables

```bash
BASE_URL=https://f8betbb1.vip/
API_BASE_URL=https://be-truytimkhobau-sc.attops.net

UI_AUTH_USERNAME=admin
UI_AUTH_PASSWORD=admin

API_AUTH_USERNAME=paizait
API_AUTH_BANK=4321
API_AUTH_SITE=SC88
```

## Mock Data Modes

Default mode is RAM-only: mock data is generated during the run and not written to disk.

```powershell
# RAM mode
$env:MOCK_STORAGE="ram"
npm run test:api-mock

# Generate and overwrite saved mock snapshots
$env:MOCK_STORAGE="file"
$env:MOCK_FILE_POLICY="overwrite"
npm run test:api-mock

# Reuse saved mock snapshots when available
$env:MOCK_STORAGE="file"
$env:MOCK_FILE_POLICY="use-saved"
npm run test:api-mock
```

Saved mock snapshots are stored under:

```text
schemas/api/mock-data/
```

## OpenAPI Contract Flow

The mock contract suite uses:

- `schemas/api/openapi.json` as the source of truth
- `schemas/api/schema-overrides.json` to patch known backend Swagger export issues
- `MockFactory` with `json-schema-faker` and `@faker-js/faker`
- AJV validation through `src/utils/openapi.validator.ts`

Run:

```bash
npm run test:api-mock
```

Expected current result:

```text
30 passed
```

## Notes Before Full Handover

- API and mock contract layers are currently stable.
- Some UI tests still depend on live website DOM and may require selector updates when the site changes.
- CI uses `config/playwright.config.ts` explicitly.