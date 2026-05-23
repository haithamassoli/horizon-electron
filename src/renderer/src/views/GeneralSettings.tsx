import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useSettings } from '@/hooks/useSettings';
import type { Theme } from '@shared/schemas';

const THEMES: { value: Theme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
];

export function GeneralSettings() {
  const { settings, ready, setAutoLaunch, setTheme } = useSettings();
  if (!ready || !settings) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
        <CardDescription>Startup and appearance. Horizon follows your choice live.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-light">Launch at login</span>
            <span className="text-xs text-muted-foreground">Starts hidden in the tray.</span>
          </div>
          <Switch
            checked={settings.general.autoLaunch}
            onCheckedChange={(v) => void setAutoLaunch(v)}
            aria-label="Toggle launch at login"
          />
        </div>

        <div className="flex items-center justify-between gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-light">Theme</span>
            <span className="text-xs text-muted-foreground">Use the OS theme or pin one.</span>
          </div>
          <div className="w-36">
            <Select value={settings.general.theme} onValueChange={(v) => void setTheme(v as Theme)}>
              <SelectTrigger aria-label="Theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {THEMES.map((theme) => (
                    <SelectItem key={theme.value} value={theme.value}>
                      {theme.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
