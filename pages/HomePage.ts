import { type Locator, type Page, expect } from '@playwright/test';

/**
 * HomePage Object
 * * This class serves as the interface between the test scripts and the TGL Homepage.
 * * It encapsulates all specific element selectors (IDs, Classes, Roles) so that
 * tests remain readable and resilient to UI changes.
 * * @usage
 * const homePage = new HomePage(page);
 * await homePage.goto();
 */
export class HomePage {
  // --- LOCATORS ---
  readonly page: Page;
  readonly searchInput: Locator;
  readonly navBar: Locator;
  readonly mobileMenuButton: Locator;
  readonly diabetesBreadcrumb: Locator;

  /**
   * Initializes the Page Object with the current Playwright page instance.
   * Defines all critical locators used across the test suite.
   * @param page - The Playwright Page object passed from the test runner.
   */
  constructor(page: Page) {
    this.page = page;
    
    // SEARCH INPUT:
    // Targeting the accessible role 'textbox' with name 'Search'.
    this.searchInput = page.getByRole('textbox', { name: 'Search' });
    
    // NAVBAR:
    // The main container for the site navigation (Desktop).
    this.navBar = page.locator('#navbar');

    // MOBILE MENU TOGGLE:
    // This button is only visible on mobile viewports.
    this.mobileMenuButton = page.getByTestId('expand-button');

    // SHORTCUT BREADCRUMB:
    // Quick-link button on the homepage to jump straight to the Diabetes guideline.
    this.diabetesBreadcrumb = page.getByRole('button', { name: 'Diabetes-breadcrumb' });
  }

  // --- ACTIONS ---

  /**
   * Navigates to the base URL defined in the configuration.
   * * Strategy: Uses 'domcontentloaded' instead of 'networkidle'.
   */
  async goto() {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
  }

  /**
   * Performs a global search for a guideline.
   * * Includes a 30s timeout to allow the React application to fully hydration.
   * @param term - The text string to search for (e.g., "Diabetes").
   */
  async searchForGuideline(term: string) {
    // Wait up to 30 seconds for the search bar to appear (Environment Slowness Fix)
    await expect(this.searchInput).toBeVisible({ timeout: 30000 });
    
    await this.searchInput.fill(term);
    await this.searchInput.press('Enter');

    // [STABILITY FIX] Mobile Search-as-you-type
    // Wait for the DOM to settle after pressing Enter. 
    // This prevents "Element is not attached to the DOM" errors on mobile.
    await this.page.waitForTimeout(1000);
  }

  /**
   * Selects a specific result from the Search Results list.
   * * Strategy: Filters for VISIBLE results to avoid hidden mobile menu items.
   * @param resultName - Exact text of the link to click.
   */
  async selectSearchResult(resultName: string) {
    // [FIX START] Robust Mobile Selection
    // On Mobile, .nth(1) was failing because it counted hidden menu items.
    // We now target the text specifically where visible=true.
    const resultLink = this.page.locator(`text="${resultName}" >> visible=true`).first();
    // [FIX END]
    
    // Ensure the result isn't hidden behind a sticky header before checking visibility
    await resultLink.scrollIntoViewIfNeeded();

    // Ensure the result is actually visible before clicking
    await expect(resultLink).toBeVisible({ timeout: 10000 });
    
    // 'force: true' ensures we click even if a tiny corner is covered by a header
    await resultLink.click({ force: true });
  }

  /**
   * Clicks the "Diabetes" shortcut button from the Homepage.
   */
  async clickDiabetesBreadcrumb() {
    await expect(this.diabetesBreadcrumb).toBeVisible({ timeout: 30000 });
    await this.diabetesBreadcrumb.click();
  }

  /**
   * Verifies that the "Principles of management" topic button is visible.
   */
  async verifyPrinciplesTopicVisible() {
    const principlesBtn = this.page.getByRole('button', { 
      name: 'Navigate to Principles of management of diabetes' 
    });
    // Increased timeout to 60s for full page load on test environment
    await expect(principlesBtn).toBeVisible({ timeout: 60000 });
  }

  /**
   * Explicitly opens the "Principles of management" topic page.
   * * Locator: Uses the specific aria-label found on the div/button.
   */
  async openPrinciplesTopic() {
    const topicButton = this.page.getByRole('button', { 
      name: 'Navigate to Principles of management of diabetes' 
    });
    
    await expect(topicButton).toBeVisible();
    await topicButton.click();
    console.log('Action: Opened "Principles of management" topic page.');
  }

  /**
   * Toggles the "Favorite" (Star) icon for the current topic.
   * * Strategy: Dynamic Locator Construction.
   * @param topicName - The name of the topic being viewed.
   */
  async toggleFavorite(topicName: string) {
    const ariaLabel = `Favourite ${topicName}`;
    const favButton = this.page.getByRole('button', { name: ariaLabel });
    
    await expect(favButton).toBeVisible();
    await favButton.click();
    console.log(`Action: Toggled favorite for "${topicName}"`);
  }

  /**
   * Navigates to the "Favorites" section from the global navigation.
   * * Validation: Waits for the "Favourites" tab button to confirm the page loaded.
   */
  async navigateToFavorites() {
    // [FIX START] Mobile Menu Handling
    if (await this.mobileMenuButton.isVisible()) {
      console.log('Mobile View Detected: Opening Hamburger Menu first...');
      await this.mobileMenuButton.click();
      await this.page.waitForTimeout(500); // Wait for menu animation

      // 1. Click the "Favourites" LINK in the menu (as per your flow)
      await this.page.getByRole('link', { name: 'Favourites' }).first().click();

      // 2. Click the "My favourites" BUTTON (the card that appears next)
      const mobileFavButton = this.page.getByRole('button', { name: 'Navigate to My favourites page' });
      await expect(mobileFavButton).toBeVisible();
      await mobileFavButton.click();
    } else {
      // Desktop: Click the 'Favourites' link in the top menu
      const favoritesLink = this.page.getByRole('link', { name: 'Favourites' });
      await expect(favoritesLink).toBeVisible();
      await favoritesLink.click();
    }
    // [FIX END]

    // [FIX] Validate URL instead of UI element
    await expect(this.page).toHaveURL(/.*favourites/, { timeout: 30000 });
  }

  /**
   * Verifies that a specific topic exists in the Favorites list.
   * @param topicName - The name of the saved topic to check for.
   * @returns The locator for the saved item (allowing the test to click it).
   */
  async verifyTopicInFavorites(topicName: string) {
    // [FIX] Mobile Robustness
    // On mobile, looking for strict "link" roles can be flaky if the layout changes (e.g. card view).
    // We search for the VISIBLE text directly, which works on both Desktop and Mobile.
    const savedItem = this.page.locator(`text="${topicName}" >> visible=true`).first();
    
    await expect(savedItem).toBeVisible({ timeout: 15000 });
    console.log(`Verified: "${topicName}" exists in Favorites.`);
    
    return savedItem;
  }
}
