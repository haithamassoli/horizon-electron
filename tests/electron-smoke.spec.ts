import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

async function launchApp(): Promise<{ app: ElectronApplication; page: Page; userDataDir: string }> {
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'horizon-smoke-'));
  const app = await electron.launch({
    args: [path.join(process.cwd(), 'out/main/index.js')],
    env: {
      ...process.env,
      HORIZON_USER_DATA_DIR: userDataDir,
      HORIZON_DISABLE_LOGIN_ITEM_UPDATES: '1'
    }
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  return { app, page, userDataDir };
}

async function closeApp(app: ElectronApplication, userDataDir: string): Promise<void> {
  await app.close();
  await fs.rm(userDataDir, { recursive: true, force: true });
}

async function openSettings(app: ElectronApplication, page: Page): Promise<Page> {
  const settingsWindowPromise = app.waitForEvent('window');
  await page.evaluate(() => window.horizon.onboarding.complete()).catch(() => undefined);
  const settingsPage = await settingsWindowPromise;
  await settingsPage.waitForLoadState('domcontentloaded');
  await expect(settingsPage.getByRole('heading', { name: 'Breaks' })).toBeVisible();
  return settingsPage;
}

test('open settings, change break interval, scheduler updates', async () => {
  const { app, page, userDataDir } = await launchApp();
  try {
    const settingsPage = await openSettings(app, page);
    const before = await settingsPage.evaluate(() => window.horizon.state.get());

    await settingsPage.evaluate(async (intervalMinutes) => {
      const current = await window.horizon.settings.get();
      await window.horizon.settings.set({
        ...current,
        breaks: { ...current.breaks, intervalMinutes }
      });
    }, 21);

    await expect
      .poll(() => settingsPage.evaluate(() => window.horizon.state.get()))
      .toMatchObject({ lifecycle: 'running' });
    const after = await settingsPage.evaluate(() => window.horizon.state.get());
    expect(after.nextBreakAt).not.toBe(before.nextBreakAt);
  } finally {
    await closeApp(app, userDataDir);
  }
});

test('trigger break now, overlay spawns and dismisses', async () => {
  const { app, page, userDataDir } = await launchApp();
  try {
    const settingsPage = await openSettings(app, page);
    await settingsPage.evaluate(() => window.horizon.tray.dispatch('break-now'));

    await expect.poll(() => app.windows().some((win) => win.url().includes('#/overlay/primary'))).toBe(true);
    const overlay = app.windows().find((win) => win.url().includes('#/overlay/primary'));
    expect(overlay).toBeDefined();
    if (!overlay) throw new Error('Primary overlay did not spawn');
    const init = await overlay.evaluate(() => window.horizon.overlay.init());
    await expect.poll(() => app.windows().filter((win) => win.url().includes('#/overlay')).length).toBeGreaterThan(0);

    await overlay.evaluate((sessionId) => window.horizon.overlay.skip(sessionId), init.sessionId);
    await expect.poll(() => app.windows().filter((win) => win.url().includes('#/overlay')).length).toBe(0);
  } finally {
    await closeApp(app, userDataDir);
  }
});

test('pause for 15m changes tray/scheduler state and blocks next break', async () => {
  const { app, page, userDataDir } = await launchApp();
  try {
    const settingsPage = await openSettings(app, page);
    const state = await settingsPage.evaluate(() => window.horizon.tray.dispatch('pause-15m'));

    expect(state.lifecycle).toBe('paused');
    expect(state.nextBreakAt).toBeNull();
    expect(state.pausedUntil).not.toBeNull();
    expect(state.pausedUntil! - Date.now()).toBeGreaterThan(14 * 60_000);
  } finally {
    await closeApp(app, userDataDir);
  }
});
