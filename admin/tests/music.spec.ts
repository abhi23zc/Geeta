import { test, expect } from '@playwright/test';
import { editorSeed } from '../src/music-editor-model';
import { parseMusicReleaseV2 } from '../../shared/music-presentation';
test('nontechnical editing, category assignment, preview, publication and local recovery', async ({ page }) => {
  let draft = editorSeed(); let published: ReturnType<typeof editorSeed> | null = null; let publications = 0;
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/music/admin/**', async route => {
    const op = route.request().url().split('/').at(-1); const body = route.request().postDataJSON();
    if (op === 'load') await route.fulfill({ json: { draft, release: published, releaseId: published?.releaseId ?? null, releases: [], media: [], draftUpdatedAt: new Date().toISOString() } });
    else if (op === 'draft') { draft = body.catalog; await route.fulfill({ json: { saved: true } }); }
    else if (op === 'publish') { try { published = parseMusicReleaseV2(body.catalog); published.releaseId = 'published-version'; publications++; draft = published; await route.fulfill({ json: { releaseId: published.releaseId } }); } catch (error) { await route.fulfill({ status: 400, json: { error: String(error) } }); } }
    else await route.fulfill({ json: {} });
  });
  await page.goto('/tests/music-fixture.html');
  await expect(page.getByRole('status')).toContainText('Ready to edit');
  await page.getByLabel('Page title · English', { exact: true }).fill('Our Sacred Sounds');
  await expect(page.locator('.music-phone h3').first()).toHaveText('Our Sacred Sounds');
  await page.getByRole('button', { name: 'Categories', exact: true }).click();
  await page.getByRole('button', { name: '+ Add category', exact: true }).click();
  await page.getByLabel('Category name · English', { exact: true }).fill('Evening Calm');
  await page.getByLabel('Bhagavad Gita · 10.20', { exact: true }).check();
  await page.getByRole('button', { name: 'Archive category', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Reassign');
  await page.getByRole('button', { name: 'Home card', exact: true }).click();
  await page.getByLabel('title · English', { exact: true }).fill('Your peaceful pause');
  await expect(page.locator('.music-phone h3')).toHaveText('Your peaceful pause');
  await page.getByRole('button', { name: 'Library page', exact: true }).click();
  await page.getByLabel('Add a section', { exact: true }).selectOption('banner');
  await page.getByLabel('Section heading · English', { exact: true }).fill('Breathe and listen');
  await expect(page.locator('.music-phone')).toContainText('Breathe and listen');
  await page.getByRole('button', { name: 'Review & publish', exact: true }).click();
  await page.getByRole('button', { name: 'Publish music page', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Published successfully');
  expect(publications).toBe(1); expect(published?.presentation.header.title.en).toBe('Our Sacred Sounds');
  expect(published?.tracks[0].category).not.toBe('gita');
  await page.screenshot({ path: '/tmp/music-studio-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '/tmp/music-studio-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
test('publication conflicts retain edits and show a recoverable message', async ({ page }) => {
  const draft = editorSeed();
  await page.route('**/api/music/admin/**', async route => {
    const op = route.request().url().split('/').at(-1);
    await route.fulfill(op === 'publish' ? { status: 409, json: { error: 'conflict' } } : { json: op === 'load' ? { draft, releaseId: null, releases: [], media: [] } : { saved: true } });
  });
  await page.goto('/tests/music-fixture.html'); await expect(page.getByRole('status')).toContainText('Ready to edit');
  await page.getByLabel('Page title · English', { exact: true }).fill('Keep my draft');
  await page.getByRole('button', { name: 'Review & publish', exact: true }).click(); await page.getByRole('button', { name: 'Publish music page', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('draft is safe');
  await expect(page.getByLabel('Page title · English', { exact: true })).toHaveValue('Keep my draft');
  expect(await page.evaluate(() => localStorage.getItem('music-studio-v2:browser-test'))).toContain('Keep my draft');
});
test('a newer local draft can be recovered without technical editing', async ({ page }) => {
  const seed = editorSeed(), recovered = editorSeed(); recovered.presentation.header.title.en = 'Recovered title';
  await page.addInitScript(value => localStorage.setItem('music-studio-v2:browser-test', JSON.stringify({ page: value, savedAt: Date.now() + 10000 })), recovered);
  await page.route('**/api/music/admin/**', async route => route.fulfill({ json: route.request().url().endsWith('/load') ? { draft: seed, releaseId: null, releases: [], media: [], draftUpdatedAt: '2026-01-01T00:00:00Z' } : { saved: true } }));
  await page.goto('/tests/music-fixture.html'); await page.getByRole('button', { name: 'Recover local edits', exact: true }).click();
  await expect(page.getByLabel('Page title · English', { exact: true })).toHaveValue('Recovered title');
  await expect(page.locator('.music-phone h3').first()).toHaveText('Recovered title');
});
test('a verified upload uses its local preview without a second Storage download', async ({ page }) => {
  const draft = editorSeed(); let previewDownloads = 0;
  const objectName = 'music/uploads/browser-test/test.mp3';
  await page.route('**/api/music/admin/**', async route => {
    const op = route.request().url().split('/').at(-1);
    await route.fulfill({ json: op === 'load' ? { draft, releaseId: null, releases: [], media: [] } : op === 'validate-asset' ? { id: 'verified-recording', url: 'https://storage.googleapis.com/demo-geeta.appspot.com/music/validated/test.audio', mime: 'audio/mpeg', bytes: 4, sha256: 'a'.repeat(64), durationMs: 1000 } : { saved: true } });
  });
  await page.route('https://firebasestorage.googleapis.com/**', async route => {
    if (route.request().method() === 'GET') { previewDownloads++; await route.abort(); return; }
    if (route.request().headers()['x-goog-upload-protocol'] === 'multipart') { await route.fulfill({ json: { bucket: 'demo-geeta.appspot.com', name: new URL(route.request().url()).searchParams.get('name') || objectName, generation: '1', metageneration: '1', size: '4', contentType: 'audio/mpeg' } }); return; }
    await route.fulfill({ status: 200, headers: { 'x-goog-upload-url': 'http://127.0.0.1:5178/mock-recording-upload', 'x-goog-upload-status': 'active' }, body: '' });
  });
  await page.route('**/mock-recording-upload', route => route.fulfill({ status: 200, headers: { 'x-goog-upload-status': 'final' }, json: { bucket: 'demo-geeta.appspot.com', name: objectName, generation: '1', metageneration: '1', size: '4', contentType: 'audio/mpeg', downloadTokens: 'test' } }));
  await page.goto('/tests/music-fixture.html'); await expect(page.getByRole('status')).toContainText('Ready to edit');
  await page.getByRole('button', { name: 'Recordings', exact: true }).click(); await page.getByRole('button', { name: '+ Add recording', exact: true }).click();
  await page.getByLabel('Recording credits / owner', { exact: true }).fill('Recording owner');
  await page.getByLabel('I confirm we have the rights to publish this recording', { exact: true }).check();
  await page.locator('input[type=file][accept=".mp3,.m4a"]').setInputFiles({ name: 'recording.mp3', mimeType: 'audio/mpeg', buffer: Buffer.from('test') });
  await expect(page.locator('audio')).toHaveAttribute('src', /^blob:/);
  await expect(page.getByRole('status')).not.toContainText('retry-limit-exceeded');
  expect(previewDownloads).toBe(0);
});
