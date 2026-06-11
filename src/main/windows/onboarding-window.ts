import { BrowserWindow, shell, app } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { showSettingsWindow } from './settings-window';
import { getSettingsStore } from '../store/settings-store';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let onboardingWindow: BrowserWindow | null = null;
let appIsQuitting = false;

app.on('before-quit', () => {
  appIsQuitting = true;
});

export function getOnboardingWindow(): BrowserWindow | null {
  return onboardingWindow;
}

export function showOnboardingWindow(): BrowserWindow {
  if (onboardingWindow && !onboardingWindow.isDestroyed()) {
    onboardingWindow.show();
    onboardingWindow.focus();
    return onboardingWindow;
  }

  onboardingWindow = new BrowserWindow({
    width: 640,
    height: 600,
    minWidth: 560,
    minHeight: 540,
    title: 'Welcome to Horizon',
    backgroundColor: '#f6f9fc',
    resizable: false,
    maximizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: false
    }
  });

  onboardingWindow.setMenuBarVisibility(false);

  onboardingWindow.once('ready-to-show', () => {
    onboardingWindow?.show();
  });

  // Closing the onboarding window before completion treats it as a "Start with defaults" —
  // mark complete so a relaunch doesn't trap the user in onboarding forever.
  onboardingWindow.on('close', () => {
    if (appIsQuitting) return;
    const store = getSettingsStore();
    const current = store.get();
    if (!current.firstLaunchComplete) {
      store.set({ ...current, firstLaunchComplete: true });
    }
  });

  onboardingWindow.on('closed', () => {
    onboardingWindow = null;
  });

  onboardingWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  const devUrl = process.env['ELECTRON_RENDERER_URL'];
  if (devUrl) {
    void onboardingWindow.loadURL(`${devUrl}#/onboarding`);
  } else {
    void onboardingWindow.loadFile(path.join(__dirname, '../renderer/index.html'), {
      hash: '/onboarding'
    });
  }

  return onboardingWindow;
}

export function finishOnboardingAndOpenSettings(): void {
  if (onboardingWindow && !onboardingWindow.isDestroyed()) {
    onboardingWindow.close();
  }
  showSettingsWindow();
}
