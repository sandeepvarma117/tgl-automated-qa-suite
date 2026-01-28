import { type Locator, type Page, expect } from '@playwright/test';

/**
 * HomePage Object
 * Encapsulates selectors and interactions for the Therapeutic Guidelines Homepage.
 */
export class HomePage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly navBar: Locator;
  readonly mobileMenuButton: Locator;
  readonly diabetesBreadcrumb: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByRole('textbox', { name: 'Search' });
    this.navBar = page.locator('#navbar');
    this.mobileMenuButton = page.getByTestId('expand-button');
    this.diabetesBreadcrumb = page.getByRole('button', { name: 'Diabetes-breadcrumb' });
  }

  // --- ACTIONS ---

  async goto() {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
  }

  async searchForGuideline(term: string) {
    await expect(this.searchInput).toBeVisible({ timeout: 30000 });
    await this.searchInput.fill(term);
    await this.searchInput.press('Enter');

    // FIX FOR MOBILE: Dismiss the virtual keyboard so it doesn't cover results
    await this.searchInput.blur(); 
  }

  async selectSearchResult(resultName: string) {
    // FIX FOR MOBILE: results might be hidden behind sticky headers.
    // We scroll the specific element into view before checking visibility.
    const resultLink = this.page.getByText(resultName).nth(1);
    
    // Force a scroll to try and uncover the element
    await resultLink.scrollIntoViewIfNeeded();

    await expect(resultLink).toBeVisible({ timeout: 10000 });
    await resultLink.click();
  }

  async clickDiabetesBreadcrumb() {
    await expect(this.diabetesBreadcrumb).toBeVisible({ timeout: 30000 });
    await this.diabetesBreadcrumb.click();
  }

  async verifyPrinciplesTopicVisible() {
    const principlesBtn = this.page.getByRole('button', { 
      name: 'Navigate to Principles of management of diabetes' 
    });
    await expect(principlesBtn).toBeVisible({ timeout: 60000 });
  }

  async openPrinciplesTopic() {
    const topicButton = this.page.getByRole('button', { 
      name: 'Navigate to Principles of management of diabetes' 
    });
    await expect(topicButton).toBeVisible();
    await topicButton.click();
  }

  async toggleFavorite(topicName: string) {
    const ariaLabel = `Favourite ${topicName}`;
    const favButton = this.page.getByRole('button', { name: ariaLabel });
    await expect(favButton).toBeVisible();
    await favButton.click();
  }

  /**
   * SMART NAVIGATION: Handles both Desktop and Mobile layouts.
   */
  async navigateToFavorites() {
    // 1. Check if we are on Mobile by seeing if the Hamburger button is visible
    if (await this.mobileMenuButton.isVisible()) {
        console.log('Mobile View Detected: Opening Hamburger Menu first...');
        await this.mobileMenuButton.click();
    }

    // 2. Now the 'Favourites' link should be visible (either in top bar or opened menu)
    const favoritesLink = this.page.getByRole('link', { name: 'Favourites' });
    await expect(favoritesLink).toBeVisible();
    await favoritesLink.click();
    
    // 3. Validation
    const favoritesTab = this.page.getByRole('button', { name: 'Favourites' });
    await expect(favoritesTab).toBeVisible({ timeout: 30000 });
  }

  async verifyTopicInFavorites(topicName: string) {
    const savedItem = this.page.getByRole('link', { name: topicName });
    await expect(savedItem).toBeVisible();
    return savedItem;
  }
}