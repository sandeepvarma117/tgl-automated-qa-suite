import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';

test.describe('TGL Web Application - Critical User Journeys', () => {
  
  let homePage: HomePage;

  /**
   * GLOBAL SETUP
   * Runs before every individual test case.
   * Ensures we always start with a fresh browser instance on the Homepage.
   */
  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.goto();
  });

  /**
   * TC-00: SMOKE TEST
   * Objective: Verify basic application health.
   * If this fails, the environment is likely down, and further testing is unnecessary.
   */
  test('TC-00: Homepage loads successfully with correct title', async ({ page }) => {
    // Validation: Checks against the <title> tag in the HTML head
    await expect(page).toHaveTitle(/Home | Therapeutic Guidelines/);
  });

  /**
   * TC-01: SEARCH FUNCTIONALITY
   * Objective: Verify a user can find a guideline using the global search bar.
   * Data Source: "Diabetes" is a core topic known to exist in the test environment.
   */
  test('TC-01: User can search for "Diabetes" and navigate to the topic page', async ({ page }) => {
    const searchTerm = 'Diabetes';
    
    // 1. ACTION: Perform the search
    // (This encapsulates waiting for the search bar to hydrate/load)
    await homePage.searchForGuideline(searchTerm);

    // 2. VERIFICATION: Confirm we routed to the Search Results page
    await expect(page).toHaveURL(/.*search/);

    // 3. ACTION: Select the correct result
    // Technical Note: We select the result using the text "Diabetes".
    // The Page Object handles the logic to ensure we don't click the input box by mistake.
    await homePage.selectSearchResult('Diabetes');
    
    // 4. FINAL VERIFICATION: Confirm we routed to the Guideline Landing Page
    await expect(page).toHaveURL(/.*diabetes/i);
  });

  /**
   * TC-02: BREADCRUMB NAVIGATION
   * Objective: Verify the "Quick Navigation" buttons (breadcrumbs) on the homepage work.
   * Scenario: User clicks "Diabetes" directly from Home to access "Principles of Management".
   */
  test('TC-02: User can navigate to "Principles of management" from homepage breadcrumb', async ({ page }) => {
    // 1. ACTION: Click the homepage shortcut button
    await homePage.clickDiabetesBreadcrumb();

    // 2. VERIFICATION: Ensure the "Principles of Management" topic button appears.
    // This confirms that the specific Diabetes content has loaded successfully.
    await homePage.verifyPrinciplesTopicVisible();
  });

  /**
   * TC-03: RESPONSIVE DESIGN (MOBILE)
   * Objective: Verify the Navigation Bar adapts correctly to smaller screens (PWA Requirement).
   * Device Target: iPhone SE (375x667)
   */
  test('TC-03: Mobile menu button is visible on mobile viewports', async ({ page }) => {
    // 1. SETUP: Force the browser context to Mobile dimensions
    await page.setViewportSize({ width: 375, height: 667 });
    
    // 2. ACTION: Reload the page
    // Technical Note: React apps often calculate layout on load. We reload to force 
    // the CSS media queries and JS layout logic to re-run for mobile.
    await page.reload({ waitUntil: 'domcontentloaded' });

    // 3. VERIFICATION: Check for the "Hamburger" menu icon
    // This element should ONLY be visible on mobile, never on desktop.
    await expect(homePage.mobileMenuButton).toBeVisible();
  });

  /**
   * TC-04: END-TO-END FAVORITES WORKFLOW
   * Objective: Verify the full lifecycle of a favorite (Add -> Persist -> Access).
   * Complexity: High (Navigates multiple pages, modifies state, verifies persistence).
   */
  test('TC-04: User can add a topic to Favorites and navigate back to it from the list', async ({ page }) => {
    // --- PART 1: SETUP (Navigate to Content) ---
    // Reuse breadcrumb logic to get to the content quickly
    await homePage.clickDiabetesBreadcrumb();
    await homePage.verifyPrinciplesTopicVisible();
    
    // Explicitly open the content page to access the "Favorite" button
    await homePage.openPrinciplesTopic();

    const topicName = 'Principles of management of diabetes';
    // Wait for the specific topic header to ensure content is fully readable
    await expect(page.getByRole('heading', { name: topicName })).toBeVisible({ timeout: 30000 });

    // --- PART 2: STATE MODIFICATION (Add Favorite) ---
    await homePage.toggleFavorite(topicName);

    // --- PART 3: DATA PERSISTENCE CHECK (Return Home) ---
    // We navigate away to the dashboard to prove the data survives a page change.
    await homePage.goto();

    // --- PART 4: ACCESS FAVORITES ---
    await homePage.navigateToFavorites();

    // --- PART 5: FUNCTIONAL VERIFICATION ---
    // Verify the item exists in the list and is clickable
    const favLink = await homePage.verifyTopicInFavorites(topicName);
    await favLink.click();

    // --- PART 6: FINAL CONFIRMATION ---
    // Ensure the favorite link actually took us back to the correct content
    await expect(page.getByRole('heading', { name: topicName })).toBeVisible();
  });

});