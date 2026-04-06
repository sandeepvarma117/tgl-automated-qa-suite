import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';

test.describe('TGL Web Application - Critical User Journeys', () => {
  let homePage: HomePage;

  /**
   * Every test starts on the configured baseURL homepage (test.app or stage.app).
   * Fresh page each time keeps journeys independent.
   */
  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.goto();
  });

  /**
   * TC-00: Smoke — if title is wrong or missing, the app shell likely failed to load.
   */
  test('TC-00: Homepage loads successfully with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Home | Therapeutic Guidelines/);
  });

  /**
   * TC-01: Search journey — find “Diabetes”, open first sensible result, land on diabetes topic URL.
   * searchForGuideline already asserts we reached a search URL after Enter.
   */
  test('TC-01: User can search for "Diabetes" and navigate to the topic page', async ({ page }) => {
    await homePage.searchForGuideline('Diabetes');
    await homePage.selectSearchResult('Diabetes');
    await expect(page).toHaveURL(/.*diabetes/i);
  });

  /**
   * TC-02: Breadcrumb — from home, jump into Diabetes tree and prove the Principles entry is offered.
   */
  test('TC-02: User can navigate to "Principles of management" from homepage breadcrumb', async ({ page }) => {
    await homePage.clickDiabetesBreadcrumb();
    await homePage.verifyPrinciplesTopicVisible();
  });

  /**
   * TC-03: Responsive — small viewport + reload forces media-query layout; hamburger must show.
   * (Desktop projects never see expand-button as primary nav.)
   */
  test('TC-03: Mobile menu button is visible on mobile viewports', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(homePage.mobileMenuButton).toBeVisible();
  });

  /**
   * TC-04: Favourites E2E
   * 1) Reach a real topic page and confirm heading.
   * 2) Star the topic (persist favourite).
   * 3) Brief wait for backend/state — then open account hub via URL (stable vs menu).
   * 4) Mobile: tap “My favourites” on hub; Desktop: list already visible.
   * 5) Assert topic in list, open it, assert heading again (navigation works).
   */
  test('TC-04: User can add a topic to Favorites and navigate back to it from the list', async ({
    page,
  }) => {
    await homePage.clickDiabetesBreadcrumb();
    await homePage.openPrinciplesTopic();

    const topicName = 'Principles of management of diabetes';
    await expect(page.getByRole('heading', { name: topicName })).toBeVisible({ timeout: 30_000 });

    await homePage.toggleFavorite(topicName);
    // Allow favourite write to complete before leaving the topic shell.
    await page.waitForTimeout(2000);
    await homePage.gotoAccountLanding();
    await homePage.openFavouritesListFromAccountLanding();

    const favLink = await homePage.verifyTopicInFavorites(topicName);
    await favLink.click();

    await expect(page.getByRole('heading', { name: topicName })).toBeVisible();
  });
});
