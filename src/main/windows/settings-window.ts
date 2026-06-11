import { BrowserWindow, shell, app } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let settingsWindow: BrowserWindow | null = null;
let appIsQuitting = false;

app.on('before-quit', () => {
  appIsQuitting = true;
});

export function getSettingsWindow(): BrowserWindow | null {
  return settingsWindow;
}

export function showSettingsWindow(): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    return settingsWindow;
  }

  settingsWindow = new BrowserWindow({
    width: 720,
    height: 720,
    minWidth: 560,
    minHeight: 560,
    title: 'Horizon',
    backgroundColor: '#f6f9fc',
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

  settingsWindow.setMenuBarVisibility(false);

  settingsWindow.once('ready-to-show', () => {
    settingsWindow?.show();
  });

  settingsWindow.on('close', (event) => {
    if (!appIsQuitting) {
      event.preventDefault();
      settingsWindow?.hide();
    }
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });

  settingsWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const devUrl = process.env['ELECTRON_RENDERER_URL'];
  if (devUrl) {
    void settingsWindow.loadURL(devUrl);
  } else {
    void settingsWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  return settingsWindow;
}
