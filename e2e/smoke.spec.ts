import { test, expect } from '@playwright/test';
import { buildShopifyCartUrl, buildMicrositeUrl, buildCcpEditUrl } from '../constants';

test.describe('Smoke: Routing & Cart-URL', () => {
  test('Konfigurator lädt', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    // Marke / Hauptflow sichtbar (kein leerer Root)
    await expect(page.locator('#root')).not.toBeEmpty();
  });

  test('CCP-Route lädt ohne Crash', async ({ page }) => {
    await page.goto('/ccp');
    await expect(page.locator('#root')).toBeVisible();
  });

  test('Admin-Route lädt Login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.getByText(/admin|anmelden|e-mail|passwort/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('Cart-URL enthält Config-ID und CCP-Properties', async () => {
    const shortId = 'ABCDEFGHJKLMNPQR';
    const token = 'a'.repeat(64);
    const url = buildShopifyCartUrl(
      '56564338262361',
      shortId,
      'https://example.com/preview.png',
      'https://konfigurator.nudaim3d.de',
      token
    );
    expect(url).toContain('properties%5BConfig-ID%5D=' + shortId);
    expect(url).toContain('nudaim3d.de/cart/add');
    expect(buildMicrositeUrl('https://konfigurator.nudaim3d.de', shortId)).toContain(`id=${shortId}`);
    expect(buildCcpEditUrl('https://konfigurator.nudaim3d.de', shortId, token)).toContain('t=');
  });
});
