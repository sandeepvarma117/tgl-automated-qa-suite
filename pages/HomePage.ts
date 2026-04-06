import { type Locator, type Page, expect } from '@playwright/test';

/**
 * HomePage object
 *
 * Single place for selectors and actions against the TG homepage / shared shell.
 * UI tweaks usually mean updating this file only, not every test.
 */
export class HomePage {
  readonly page: Page;
  /** Global guideline search (role=textbox, name Search). */
  readonly searchInput: Locator;
  /** Mobile hamburger — matches <button data-testid="expand-button">. */
  readonly mobileMenuButton: Locator;
  /** Homepage shortcut into the Diabetes guideline tree. */
  readonly diabetesBreadcrumb: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByRole('textbox', { name: 'Search' });
    this.mobileMenuButton = page.getByTestId('expand-button');
    this.diabetesBreadcrumb = page.getByRole('button', { name: 'Diabetes-breadcrumb' });
  }

  /** “Navigate to Principles of management of diabetes” control (shared by TC-02 / TC-04). */
  private principlesTopicButton(): Locator {
    return this.page.getByRole('button', {
      name: 'Navigate to Principles of management of diabetes',
    });
  }

  /**
   * On /app/accountLanding (mobile): card with role=button and “My favourites” / full aria-label.
   * Desktop skips this — favourites list is already on the hub.
   */
  private myFavouritesEntryCard(): Locator {
    return this.page
      .getByRole('button', { name: /Navigate to My favourites page|My favourites/i })
      .filter({ visible: true })
      .first();
  }

  /**
   * Open site root using baseURL from Playwright config (test vs staging).
   * domcontentloaded avoids hanging on long-polling SPAs.
   */
  async goto() {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
  }

  /**
   * Run a global search from the homepage.
   * 1) Wait for search box (slow hydration on test/stage).
   * 2) Type term + Enter.
   * 3) Assert URL moved to a search results route before the test picks a row.
   */
  async searchForGuideline(term: string) {
    await expect(this.searchInput).toBeVisible({ timeout: 30_000 });
    await this.searchInput.fill(term);
    await this.searchInput.press('Enter');
    await expect(this.page).toHaveURL(/search/i, { timeout: 20_000 });
  }

  /**
   * From search results, click the first visible hit for the given label.
   * >> visible=true avoids stale/hidden menu rows on mobile.
   * force:true helps when a sticky header slightly overlaps the hit box.
   */
  async selectSearchResult(resultName: string) {
    const resultLink = this.page.locator(`text="${resultName}" >> visible=true`).first();
    await expect(resultLink).toBeVisible({ timeout: 10_000 });
    await resultLink.click({ force: true });
  }

  /** Open Diabetes from the homepage “Guidelines” strip (breadcrumb shortcut). */
  async clickDiabetesBreadcrumb() {
    await expect(this.diabetesBreadcrumb).toBeVisible({ timeout: 30_000 });
    await this.diabetesBreadcrumb.click();
  }

  /**
   * After Diabetes shortcut: confirm the intermediate page shows the Principles-of-management entry.
   * Long timeout accounts for cold cache / staging slowness.
   */
  async verifyPrinciplesTopicVisible() {
    await expect(this.principlesTopicButton()).toBeVisible({ timeout: 60_000 });
  }

  /**
   * Drill into the actual topic page where the star (favourite) control exists.
   * Same control as verifyPrinciplesTopicVisible — we go from list card → content.
   */
  async openPrinciplesTopic() {
    const topicButton = this.principlesTopicButton();
    await expect(topicButton).toBeVisible({ timeout: 60_000 });
    await topicButton.click();
  }

  /**
   * Toggle the topic favourite star. aria-label may use British or US spelling (Favourite / Favorite).
   * force:true reduces flakes from small overlays on the icon.
   */
  async toggleFavorite(topicName: string) {
    const favButton = this.page.getByRole('button', {
      name: new RegExp(`Favo[u]?rite ${topicName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'),
    });
    await expect(favButton).toBeVisible({ timeout: 30_000 });
    await favButton.click({ force: true });
  }

  /**
   * Account hub — favourites entry in the app (path is the same on test/staging; host comes from baseURL).
   * Assert URL so we know we are not stuck on a gate or error shell.
   */
  async gotoAccountLanding() {
    await this.page.goto('/app/accountLanding', { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(/accountLanding/i, { timeout: 30_000 });
  }

  /**
   * Desktop (wide viewport): favourites are listed on account landing — nothing to open.
   * Mobile: user must tap the “My favourites” card to see the list (avoids flaky flyout menu tests).
   */
  async openFavouritesListFromAccountLanding() {
    const viewportWidth = this.page.viewportSize()?.width ?? 1280;
    if (viewportWidth >= 900) {
      return;
    }
    const card = this.myFavouritesEntryCard();
    await expect(card).toBeVisible({ timeout: 30_000 });
    await card.click({ force: true });
  }

  /**
   * Confirm the saved topic title appears in the favourites list and return its locator to click through.
   * Text + visible=true works for card layouts where role=link is inconsistent.
   */
  async verifyTopicInFavorites(topicName: string) {
    const savedItem = this.page.locator(`text="${topicName}" >> visible=true`).first();
    await expect(savedItem).toBeVisible({ timeout: 45_000 });
    return savedItem;
  }
}
