import { useEffect, useState, type ReactNode } from 'react';
import type { Theme } from '@shared/schemas';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    let mounted = true;
    void window.horizon.settings.get().then((settings) => {
      if (mounted) setTheme(settings.general.theme);
    });
    const unsubscribe = window.horizon.settings.onChanged((settings) => {
      setTheme(settings.general.theme);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (): void => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  return children;
}
