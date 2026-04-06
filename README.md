# TGL Automated Quality Assurance Suite (Proof of Concept)
[![Playwright Tests](https://github.com/sandeepvarma117/tgl-automated-qa-suite/actions/workflows/playwright.yml/badge.svg)](https://github.com/sandeepvarma117/tgl-automated-qa-suite/actions/workflows/playwright.yml)

This project is a personal automation framework built to demonstrate my technical readiness for the **Quality Assurance Engineer** role at Therapeutic Guidelines.

While I understand that an automation suite already exists for the platform, this repository serves as a practical demonstration of my ability to write scalable, maintainable, and CI-integrated tests using the modern stack required for the role.

## 🛠 Tech Stack

* **Framework:** Playwright (Node.js)
* **Language:** TypeScript
* **Design Pattern:** Page Object Model (POM)
* **CI/CD:** GitHub Actions
* **Config:** `dotenv` for local secrets; `cross-env` for Windows-friendly env vars

---

## Environments & recent changes (team reference)

| Area | What changed |
|------|----------------|
| **Dual environment** | **Test** (default) targets `https://test.app.tg.org.au/`. **Staging** targets `https://stage.app.tg.org.au/` when `PLAYWRIGHT_ENV=staging`. Controlled in `playwright.config.ts` via `PLAYWRIGHT_ENV` and optional `PLAYWRIGHT_BASE_URL`. |
| **Staging authentication** | `tests/staging-b2c.setup.ts` runs as Playwright project **`setup-staging`** (3 min timeout). Flow: landing → **Log in** → B2C (`login.test.tg.org.au`) → return to stage → **Select app** / **Therapeutic Guidelines** tile → assert **Search**; writes `playwright/.auth/staging.json` for other projects. |
| **Credentials** | `STAGING_B2C_EMAIL` and `STAGING_B2C_PASSWORD` in `.env` (copy from `.env.example`). Loads in both config and setup worker via `dotenv`. Passwords with `#` must be quoted in `.env`. `.env` is gitignored. |
| **Reports / artifacts** | Test: `playwright-report/`, `test-results/`. Staging: `playwright-report-staging/`, `test-results-staging/`. Optional override: `PLAYWRIGHT_HTML_REPORT_DIR`. Local failures use `trace: retain-on-failure` (CI keeps `on-first-retry`). |
| **TC-04 Favorites** | No longer uses home → hamburger → Favourites flyout (flaky on mobile). After **Add favorite**, short wait → **`/app/accountLanding`** (respects `baseURL`) → **desktop:** verify list on hub → **mobile (narrow viewport):** click **My favourites** card → verify topic → open topic → assert heading. See `HomePage.gotoAccountLanding()` and `openFavouritesListFromAccountLanding()`. |
| **`HomePage.ts`** | Removed `navigateToFavorites()` / menu link locators. Added account-landing helpers; `toggleFavorite` supports UK/US “Favo(u)rite” in `aria-label`. |
| **`package.json` scripts** | `npm test` → Playwright default (test env). `npm run test:staging` → staging + B2C setup. `npm run test:staging:headed` / `test:staging:debug` (inspector). |
| **CI** | Workflow still runs **test** environment only (no staging secrets). Add a separate job + GitHub Secrets if staging should run in CI. |
| **Windows** | Use `npm run …` so `cross-env` sets variables; for extra Playwright flags use `npm run test:staging -- --headed`. |

**Default URLs**

- Test: `https://test.app.tg.org.au/`
- Staging: `https://stage.app.tg.org.au/`
- Account hub (both): path `/app/accountLanding` (resolved against current `baseURL`)

---

## 🧪 What It Tests (Critical User Journeys)

| Test ID | Scenario | Why it matters |
|----|---------|-------------|
| **TC-00** | **Smoke** | Title / basic app health. |
| **TC-01** | **Search** | Users can locate guidelines (e.g., "Diabetes") and open the correct topic. |
| **TC-02** | **Navigation** | Homepage shortcuts and deep links route correctly. |
| **TC-03** | **Mobile layout** | Responsive UI (e.g., hamburger) on a small viewport. |
| **TC-04** | **Favorites** | Add favorite on topic → land on **account hub** (`/app/accountLanding`) → mobile opens **My favourites** when needed → verify persistence and reopen topic. |

---

## ⚙️ Key Engineering Decisions

### 1. Maintainability (Page Object Model)
Selectors and flows live in `HomePage.ts` so UI tweaks usually touch one file.

### 2. Device-aware logic
Viewport width drives mobile vs desktop behavior (e.g., TC-04 account landing). Mobile project uses configured device presets (e.g., Pixel 5).

### 3. CI/CD integration
GitHub Actions runs the suite on push/PR. Staging runs are intended **locally** or via a dedicated workflow with secrets.

---

## 🚀 How to Run

### Test environment (default)

1. **Install**
   ```bash
   npm install
   npx playwright install
   ```

2. **Run all tests**
   ```bash
   npm test
   # or
   npx playwright test
   ```

3. **UI mode**
   ```bash
   npx playwright test --ui
   ```

### Staging environment

1. Copy `.env.example` → `.env` and set `STAGING_B2C_EMAIL` / `STAGING_B2C_PASSWORD` (quoted if the password contains `#`).

2. Run (runs **setup-staging** first, then all tests):
   ```bash
   npm run test:staging
   ```

3. **Headed / debug**
   ```bash
   npm run test:staging:headed
   npm run test:staging:debug
   ```

4. **HTML report** (after a run)
   ```bash
   npx playwright show-report playwright-report-staging
   ```

5. **Trace** (on local failure)
   ```bash
   npx playwright show-trace test-results-staging/<run-folder>/trace.zip
   ```

---

## 🔮 Future enhancements

* **Faster B2C in automation:** Cache `storageState` longer where policy allows; add a dedicated “auth only” setup that skips redundant `waitForLoadState` / polling when a valid session file already exists; explore **API-assisted login** or a test-specific B2C user flow if the security team approves; tune timeouts from traces (replace fixed sleeps with **response / network** or **locator-stable** waits only).
* **Subscription & licensing validation:** E2E flows on staging for **active vs expired** entitlements, **renew / upgrade** prompts, **grace periods**, and **concurrent session** rules; pair UI checks with **known fixture accounts** or lightweight API setup so tests stay deterministic.
* Staging (or scheduled) job in **GitHub Actions** with repository secrets for B2C users.
* Broader **Axe-core** scans bound to critical pages.
