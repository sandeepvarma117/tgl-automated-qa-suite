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

    // [FIX START] Mobile Keyboard Handling
    // On mobile, the keyboard stays open and covers the results. We blur to dismiss it.
    await this.searchInput.blur();
    // [FIX END]
  }

  /**
   * Selects a specific result from the Search Results list.
   * * Strategy: Uses .nth(1) to avoid selecting the input box itself.
   * @param resultName - Exact text of the link to click.
   */
  async selectSearchResult(resultName: string) {
    const resultLink = this.page.getByText(resultName).nth(1);
    
    // [FIX START] Scroll Safety
    // Ensure the result isn't hidden behind a sticky header before checking visibility
    await resultLink.scrollIntoViewIfNeeded();
    // [FIX END]

    // Ensure the result is actually visible before clicking
    await expect(resultLink).toBeVisible({ timeout: 10000 });
    await resultLink.click();
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
    // If the mobile hamburger menu is visible, we must open it first to see the link.
    if (await this.mobileMenuButton.isVisible()) {
      console.log('Mobile View Detected: Opening Hamburger Menu first...');
      await this.mobileMenuButton.click();
    }
    // [FIX END]

    // 1. Find and click the 'Favourites' link in the top menu
    const favoritesLink = this.page.getByRole('link', { name: 'Favourites' });
    await expect(favoritesLink).toBeVisible();
    await favoritesLink.click();
    
    // 2. Validate the destination page loaded
    const favoritesTab = this.page.getByRole('button', { name: 'Favourites' });
    await expect(favoritesTab).toBeVisible({ timeout: 30000 });
  }

  /**
   * Verifies that a specific topic exists in the Favorites list.
   * @param topicName - The name of the saved topic to check for.
   * @returns The locator for the saved item (allowing the test to click it).
   */
  async verifyTopicInFavorites(topicName: string) {
    // In the favorites list, the topic should appear as a clickable link
    const savedItem = this.page.getByRole('link', { name: topicName });
    
    await expect(savedItem).toBeVisible();
    console.log(`Verified: "${topicName}" exists in Favorites.`);
    
    return savedItem;
  }
}