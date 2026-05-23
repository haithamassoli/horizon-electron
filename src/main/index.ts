import { app, BrowserWindow } from 'electron';
import { registerSettingsChannels } from './ipc/settings-channels';
import { registerStateChannels } from './ipc/state-channels';
import { registerPopoverChannels } from './ipc/popover-channels';
import { registerOverlayChannels } from './ipc/overlay-channels';
import { registerTodayChannels, stopTodayMidnightTimer } from './ipc/today-channels';
import { registerAudioChannels } from './ipc/audio-channels';
import { showSettingsWindow } from './windows/settings-window';
import { showOnboardingWindow } from './windows/onboarding-window';
import { getSettingsStore } from './store/settings-store';
import { getTodayStore } from './store/today-store';
import { getScheduler } from './scheduler/scheduler';
import { createTray, destroyTray } from './tray/tray';
import { wireOverlayManagerToScheduler } from './windows/overlay-manager';
import { wirePreWarningToScheduler } from './windows/pre-warning-window';
import { startActivityMonitors } from './activity';
import { startBlinkModule } from './blink';
import { startSystemIntegration } from './system-integration';

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  showSettingsWindow();
});

let unsubscribeOverlay: (() => void) | null = null;
let unsubscribePreWarning: (() => void) | null = null;
let stopActivityMonitors: (() => void) | null = null;
let stopBlink: (() => void) | null = null;
let stopSystemIntegration: (() => void) | null = null;

app.whenReady().then(async () => {
  const settingsStore = getSettingsStore();
  getTodayStore();
  const scheduler = getScheduler();

  registerSettingsChannels();
  registerStateChannels();
  registerPopoverChannels();
  registerOverlayChannels();
  registerTodayChannels();
  registerAudioChannels();

  scheduler.start();
  stopSystemIntegration = startSystemIntegration();
  unsubscribeOverlay = wireOverlayManagerToScheduler();
  unsubscribePreWarning = wirePreWarningToScheduler();
  stopActivityMonitors = await startActivityMonitors();
  stopBlink = startBlinkModule();
  createTray();

  if (settingsStore.get().firstLaunchComplete) {
    showSettingsWindow();
  } else {
    showOnboardingWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (settingsStore.get().firstLaunchComplete) {
        showSettingsWindow();
      } else {
        showOnboardingWindow();
      }
    }
  });
});

app.on('before-quit', () => {
  unsubscribeOverlay?.();
  unsubscribeOverlay = null;
  unsubscribePreWarning?.();
  unsubscribePreWarning = null;
  stopActivityMonitors?.();
  stopActivityMonitors = null;
  stopBlink?.();
  stopBlink = null;
  stopSystemIntegration?.();
  stopSystemIntegration = null;
  stopTodayMidnightTimer();
  destroyTray();
});

app.on('window-all-closed', () => {
  // Tray keeps the app alive; do NOT quit when windows close.
});
