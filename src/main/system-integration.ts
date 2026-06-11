import { app, nativeTheme } from 'electron';
import type { Settings } from '@shared/schemas';
import { getSettingsStore } from './store/settings-store';
import { getScheduler } from './scheduler/scheduler';
import { getOfficeHoursGate } from './activity/office-hours-gate';

let unsubscribeSettings: (() => void) | null = null;

export function startSystemIntegration(): () => void {
  const store = getSettingsStore();
  const officeGate = getOfficeHoursGate();
  const scheduler = getScheduler();
  const skipLoginItemUpdates = process.env['HORIZON_DISABLE_LOGIN_ITEM_UPDATES'] === '1';

  const apply = (settings: Settings): void => {
    if (!skipLoginItemUpdates) {
      app.setLoginItemSettings({
        openAtLogin: settings.general.autoLaunch,
        openAsHidden: true
      });
    }
    nativeTheme.themeSource = settings.general.theme;
  };

  const onOfficeChanged = (inside: boolean): void => {
    scheduler.notifyOfficeHoursChanged(inside);
  };

  apply(store.get());
  officeGate.on('changed', onOfficeChanged);
  officeGate.start();
  unsubscribeSettings = store.subscribe(apply);

  const onNativeThemeUpdated = (): void => {
    if (store.get().general.theme === 'system') nativeTheme.themeSource = 'system';
  };
  nativeTheme.on('updated', onNativeThemeUpdated);

  return () => {
    unsubscribeSettings?.();
    unsubscribeSettings = null;
    nativeTheme.off('updated', onNativeThemeUpdated);
    officeGate.off('changed', onOfficeChanged);
    officeGate.stop();
  };
}
