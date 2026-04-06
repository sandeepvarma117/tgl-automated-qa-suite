import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { test as setup, expect, type Page } from '@playwright/test';

/**
 * Playwright test workers do not re-import playwright.config.ts in the same way as the main process.
 * Load .env here so STAGING_B2C_* is always available inside this setup file.
 */
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

/** Saved session for all non-setup projects when PLAYWRIGHT_ENV=staging. */
const AUTH_FILE = 'playwright/.auth/staging.json';

/**
 * How long we keep polling for the stage gate “Log in” button after first paint.
 * Staging SPAs can be slow to hydrate the marketing shell.
 */
const STAGING_LOGIN_BUTTON_WAIT_MS = 90_000;

/** True when URL is the TG-hosted IdP or classic Microsoft B2C / Entra hosts. */
function isIdentityProviderUrl(url: string): boolean {
  return /login\.test\.tg\.org\.au|b2clogin\.com|login\.microsoftonline\.com|login\.microsoft\.com/i.test(
    url,
  );
}

/** Stage app host (fragment / code redirects return here after B2C). */
function isStageAppUrl(url: string): boolean {
  return /stage\.app\.tg\.org\.au/i.test(url);
}

/** Therapeutic Guidelines home global search (same as HomePage.searchInput semantics). */
function searchField(page: Page) {
  return page.getByRole('textbox', { name: 'Search' });
}

/**
 * Staging marketing gate: “Log in” primary button, or module class containing _btnLogin.
 */
function stagingLoginButton(page: Page) {
  return page
    .getByRole('button', { name: 'Log in', exact: true })
    .or(page.locator('button[class*="_btnLogin"]'))
    .first();
}

/** Visible copy on the product chooser panel. */
function selectAppMarker(page: Page) {
  return page.getByText('Select app:', { exact: true });
}

/**
 * After B2C, user may land on “Select app” with TG / other product tiles.
 * Only the “Select app:” copy distinguishes the chooser from TG home — the same
 * TG logo accessible name appears in the real app header, so we must not key off the image alone.
 */
async function isAppLauncherVisible(page: Page): Promise<boolean> {
  return selectAppMarker(page).isVisible().catch(() => false);
}

/**
 * Let the SPA commit layout after navigation without waiting for full network idle
 * (networkidle can hang on long-lived connections).
 */
async function waitForStagingLandingReady(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('load').catch(() => {});
}

/**
 * Pick Therapeutic Guidelines on the post-login product grid.
 * Prefer the app card div wrapping the TG logo; fall back to clicking the logo image.
 * Re-build locators each attempt so we never click a detached node after React re-renders.
 * Retry up to 3 times if “Select app:” stays visible (common staging flake).
 */
async function pickTherapeuticGuidelinesFromLauncher(page: Page): Promise<void> {
  const marker = selectAppMarker(page);
  await expect(marker).toBeVisible({ timeout: 30_000 });

  for (let attempt = 0; attempt < 3; attempt++) {
    const tile = page.getByRole('img', { name: 'TGLogo Logo' });
    await expect(tile).toBeVisible({ timeout: 15_000 });
    const card = page.locator('div[class*="_appCard"]').filter({ has: tile }).first();
    const target = (await card.isVisible().catch(() => false)) ? card : tile;

    // Prefer a normal click; TG tile is the actionable control in the chooser snapshot.
    try {
      await target.click({ timeout: 8_000 });
    } catch {
      await target.click({ force: true });
    }

    // SPA may navigate to TG shell before the chooser node is removed — treat Search as success too.
    await Promise.race([
      marker.waitFor({ state: 'hidden', timeout: 75_000 }),
      searchField(page).waitFor({ state: 'visible', timeout: 75_000 }),
    ]).catch(() => {});

    const searchUp = await searchField(page).isVisible().catch(() => false);
    const chooserGone = !(await marker.isVisible().catch(() => false));

    if (searchUp || chooserGone) {
      await waitForStagingLandingReady(page);
      return;
    }
  }

  throw new Error(
    'Staging setup: "Select app" did not dismiss after Therapeutic Guidelines tile (3 attempts).',
  );
}

/**
 * Home shell is ready when the global Search box is visible.
 * Some builds paint the hero (“Discover…”) slightly before Search — wait for either, then require Search.
 */
async function assertTherapeuticGuidelinesHomeReady(page: Page): Promise<void> {
  const search = searchField(page);
  const discover = page.getByRole('heading', { name: /Discover the most trusted/i });
  await expect(search.or(discover).first()).toBeVisible({ timeout: 120_000 });
  await expect(search).toBeVisible({ timeout: 60_000 });
}

/**
 * After B2C return, we may still be on the product chooser or mid-navigation.
 * Loop: if Search is up, we’re done; if chooser is up, pick TG again; short pause between rounds.
 */
async function resolveLauncherAndAssertHome(page: Page): Promise<void> {
  const deadline = Date.now() + 150_000;
  while (Date.now() < deadline) {
    if (await searchField(page).isVisible().catch(() => false)) {
      await assertTherapeuticGuidelinesHomeReady(page);
      return;
    }
    if (await isAppLauncherVisible(page)) {
      await pickTherapeuticGuidelinesFromLauncher(page);
      continue;
    }
    await page.waitForTimeout(500);
  }

  if (await isAppLauncherVisible(page)) {
    throw new Error(
      'Staging setup: still on Select app after B2C — launcher resolution failed. See trace.',
    );
  }

  await assertTherapeuticGuidelinesHomeReady(page);
}

/**
 * Staging sign-in: gate → B2C hosted login → back to stage.
 * Handles single- or two-step password B2C policies.
 * If product chooser appears, selects TG tile, then waits for Search.
 *
 * Caller must already see the stage “Log in” button.
 */
async function signInThroughB2c(page: Page, email: string, password: string): Promise<void> {
  const loginBtn = stagingLoginButton(page);
  await expect(loginBtn).toBeVisible({ timeout: 10_000 });
  await loginBtn.click({ force: true });

  // OAuth redirect to TG IdP / B2C login host.
  await page.waitForURL((u) => isIdentityProviderUrl(u.toString()), { timeout: 120_000 });

  const emailBox = page
    .getByRole('textbox', { name: /email/i })
    .or(page.locator('input[type="email"]'))
    .or(page.locator('#signInName'))
    .first();

  await emailBox.waitFor({ state: 'visible', timeout: 60_000 });
  await emailBox.fill(email);

  const passwordBox = page
    .getByRole('textbox', { name: /password/i })
    .or(page.locator('input[type="password"]'))
    .first();

  // Some policies show email only first; Next reveals password.
  const passwordAlreadyThere = await passwordBox.isVisible().catch(() => false);
  if (!passwordAlreadyThere) {
    await page.getByRole('button', { name: /next|continue/i }).first().click();
    await passwordBox.waitFor({ state: 'visible', timeout: 60_000 });
  }

  await passwordBox.fill(password);

  const b2cSubmit = page
    .getByRole('button', { name: /^Log in$/i })
    .or(page.getByRole('button', { name: /sign in|submit/i }))
    .first();
  await b2cSubmit.click();

  // Return fragment to stage.app (no longer on IdP host).
  await page.waitForURL(
    (u) => isStageAppUrl(u.toString()) && !isIdentityProviderUrl(u.toString()),
    { timeout: 120_000 },
  );

  await waitForStagingLandingReady(page);
  await resolveLauncherAndAssertHome(page);
}

/**
 * Bring the browser to Therapeutic Guidelines “home” with Search visible.
 *
 * Flow:
 * 1) Load / on stage, wait for DOM settle.
 * 2) Poll: if Log in → run full B2C + optional app picker + assert Search.
 *    If Search already visible → already logged in / past gate → assert Search.
 * 3) After poll budget: repeat checks for Search, then standalone app picker, else throw.
 */
async function ensureOnTherapeuticGuidelinesHome(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForStagingLandingReady(page);

  const deadline = Date.now() + STAGING_LOGIN_BUTTON_WAIT_MS;
  while (Date.now() < deadline) {
    if (await stagingLoginButton(page).isVisible().catch(() => false)) {
      await signInThroughB2c(page, email, password);
      return;
    }
    if (await searchField(page).isVisible().catch(() => false)) {
      await assertTherapeuticGuidelinesHomeReady(page);
      return;
    }
    await page.waitForTimeout(400);
  }

  if (await searchField(page).isVisible().catch(() => false)) {
    await assertTherapeuticGuidelinesHomeReady(page);
    return;
  }

  if (await isAppLauncherVisible(page)) {
    await pickTherapeuticGuidelinesFromLauncher(page);
    await resolveLauncherAndAssertHome(page);
    return;
  }

  throw new Error(
    'Staging: no Log in button, no Search field, and no app launcher. Check URL, session, and selectors.',
  );
}

/**
 * Global setup project (staging only): perform real B2C once, persist cookies/storage for other projects.
 *
 * Required env:
 * - STAGING_B2C_EMAIL
 * - STAGING_B2C_PASSWORD
 *
 * Note: Raw HTTP POST to B2C SelfAsserted is not used here — it requires live CSRF / tx cookies
 * from the authorize redirect; UI login + storageState is the maintainable approach.
 */
setup('staging B2C sign-in', async ({ page }) => {
  const email = process.env.STAGING_B2C_EMAIL?.trim();
  const password = process.env.STAGING_B2C_PASSWORD?.trim();

  if (!email || !password) {
    throw new Error(
      'Set STAGING_B2C_EMAIL and STAGING_B2C_PASSWORD for staging runs (e.g. in .env).',
    );
  }

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  await ensureOnTherapeuticGuidelinesHome(page, email, password);

  await page.context().storageState({ path: AUTH_FILE });
});
