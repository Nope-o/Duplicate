import { test, expect } from '@playwright/test';

function makePngBuffer() {
  const base64 =
    'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAABbZ7e0AAAAIElEQVR4nO3BMQEAAADCoPVPbQ8HFAAAAAAAAAAA8G0G0gAAcJ6mXQAAAABJRU5ErkJggg==';
  return Buffer.from(base64, 'base64');
}

async function openLiteEdit(page) {
  await page.goto('/projects/liteedit-app/');
  await expect(page.locator('#appRoot')).toBeVisible();
}

async function uploadSampleImage(page) {
  const fileInput = page.locator('#fileInput');
  await fileInput.setInputFiles({
    name: 'test.png',
    mimeType: 'image/png',
    buffer: makePngBuffer()
  });
  await expect(page.locator('#mainCanvas')).toBeVisible();
  await expect(page.locator('#countInfo')).toContainText('1 / 20');
}

test.describe('LiteEdit core UX baseline', () => {
  test('upload + edit + export sheet keyboard close', async ({ page }) => {
    await openLiteEdit(page);
    await uploadSampleImage(page);

    await page.locator('#brightnessInput').fill('120');
    await page.locator('#applyAdjustBtn').click();
    await expect(page.locator('#statusBox')).toContainText(/Adjust|Adjustment|step/i);

    await page.locator('#openExportBtn').click();
    await expect(page.locator('#exportSheet')).toHaveClass(/active/);
    await expect(page.locator('#exportSummary')).toContainText('Mode:');

    await page.keyboard.press('Escape');
    await expect(page.locator('#exportSheet')).not.toHaveClass(/active/);
  });

  test('control IA: workflow shortcuts + collapsible sections + toast close', async ({ page }) => {
    await openLiteEdit(page);

    await expect(page.locator('#workflowImportBtn')).toBeVisible();
    await expect(page.locator('#workflowEditBtn')).toBeVisible();
    await expect(page.locator('#workflowExportBtn')).toBeVisible();

    const geometrySection = page.locator('#geometrySection');
    await page.locator('#geometrySection .legend-toggle').click();
    await expect(geometrySection).toHaveClass(/is-collapsed/);
    await page.locator('#geometrySection .legend-toggle').click();
    await expect(geometrySection).not.toHaveClass(/is-collapsed/);

    await page.locator('#workflowTextBtn').click();
    await expect(page.locator('#advancedModeBtn')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#textSection')).not.toHaveClass(/is-collapsed/);

    await page.locator('#openSettingsBtn').click();
    await page.locator('#importMaxEdgeInput').selectOption('3200');
    const toast = page.locator('.toast', { hasText: 'Max import edge set to 3200px.' });
    await expect(toast).toBeVisible();
    await toast.locator('.toast-close').click();
    await expect(toast).toHaveCount(0);

    await page.locator('#reportIssueBtn').click();
    await expect(page.locator('#reportIssueSheet')).toHaveClass(/active/);
    await expect(page.locator('#downloadReportIssueBtn')).toBeVisible();
    const snapshotRaw = await page.locator('#reportIssueText').inputValue();
    const snapshot = JSON.parse(snapshotRaw);
    expect(snapshot).toHaveProperty('privacy');
    expect(snapshot).toHaveProperty('snapshotVersion', 2);
    await page.keyboard.press('Escape');
    await expect(page.locator('#reportIssueSheet')).not.toHaveClass(/active/);
  });

  test('session restore survives reload', async ({ page }) => {
    await openLiteEdit(page);
    await uploadSampleImage(page);

    // Accept both beforeunload confirmation and restore confirmation if shown.
    page.on('dialog', (dialog) => dialog.accept());
    await page.reload();

    await expect(page.locator('#mainCanvas')).toBeVisible();
    await expect(page.locator('#countInfo')).toContainText('1 / 20');
    await expect(page.locator('#liveImageInfo')).toContainText('64x64');
  });
});
