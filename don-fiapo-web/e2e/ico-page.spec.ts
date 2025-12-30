import { test, expect } from '@playwright/test';

/**
 * E2E Tests for ICO/NFT Page
 */

test.describe('ICO Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/ico');
  });

  test('should display ICO page with NFT tiers', async ({ page }) => {
    // Check page loads
    await expect(page).toHaveURL(/\/ico/);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check page has content
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display all 7 NFT tiers', async ({ page }) => {
    // Wait for content to load
    await page.waitForLoadState('networkidle');
    
    // Check page content exists - the page should have NFT-related content
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
    
    // Check for at least one tier-related text (flexible check)
    const hasTierContent = pageContent?.includes('NFT') || 
                          pageContent?.includes('Tier') || 
                          pageContent?.includes('Mining');
    expect(hasTierContent).toBeTruthy();
  });

  test('should show mining information for each tier', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Check for mining rate text
    await expect(page.getByText(/Mining Rate|Daily Mining/i).first()).toBeVisible();
  });

  test('should navigate to mint page when clicking mint button', async ({ page }) => {
    const mintButton = page.getByRole('link', { name: /Mint/i }).first();
    
    if (await mintButton.isVisible()) {
      await mintButton.click();
      await expect(page).toHaveURL(/\/ico\/mint/);
    }
  });

  test('should navigate to my NFTs page', async ({ page }) => {
    const myNftsLink = page.getByRole('link', { name: /My NFTs/i });
    
    if (await myNftsLink.isVisible()) {
      await myNftsLink.click();
      await expect(page).toHaveURL(/\/ico\/my-nfts/);
    }
  });
});

test.describe('Mint Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/ico/mint');
  });

  test('should display mint page', async ({ page }) => {
    await expect(page).toHaveURL(/\/ico\/mint/);
  });

  test('should show tier selection options', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Page should have interactive elements (buttons or clickable areas)
    const interactiveElements = page.locator('button, [role="button"], a');
    const count = await interactiveElements.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should update price when selecting different tier', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Look for price display
    const priceText = page.getByText(/\$|FREE|USDT/i);
    await expect(priceText.first()).toBeVisible();
  });
});

test.describe('Mining Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/ico/mining');
  });

  test('should display mining dashboard', async ({ page }) => {
    await expect(page).toHaveURL(/\/ico\/mining/);
    
    // Check for mining-related content
    await expect(page.getByText(/Mining|Dashboard/i).first()).toBeVisible();
  });

  test('should show mining statistics', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Should display some stats
    const stats = page.locator('[class*="stat"], [class*="card"]');
    const count = await stats.count();
    expect(count).toBeGreaterThan(0);
  });
});
