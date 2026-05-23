import { motion } from 'motion/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useSettings } from '@/hooks/useSettings';

const DAYS = [
  { value: 0, label: 'S' },
  { value: 1, label: 'M' },
  { value: 2, label: 'T' },
  { value: 3, label: 'W' },
  { value: 4, label: 'T' },
  { value: 5, label: 'F' },
  { value: 6, label: 'S' }
];

export function OfficeHoursSettings() {
  const {
    settings,
    ready,
    setOfficeHoursEnabled,
    setOfficeHoursTime,
    toggleOfficeHoursDay
  } = useSettings();
  if (!ready || !settings) return null;

  const { enabled, startTime, endTime, activeDays } = settings.officeHours;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Office hours</CardTitle>
            <CardDescription>
              Suppress breaks and blink pulses outside your working window.
            </CardDescription>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={(v) => void setOfficeHoursEnabled(v)}
            aria-label="Toggle office hours"
          />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <motion.div
          animate={{ opacity: enabled ? 1 : 0.45 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-2 gap-3"
        >
          <label className="flex flex-col gap-1.5 text-sm font-light">
            <span>Start</span>
            <input
              type="time"
              value={startTime}
              disabled={!enabled}
              onChange={(event) => void setOfficeHoursTime('startTime', event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm font-light shadow-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-light">
            <span>End</span>
            <input
              type="time"
              value={endTime}
              disabled={!enabled}
              onChange={(event) => void setOfficeHoursTime('endTime', event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm font-light shadow-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>
        </motion.div>

        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">Active days</span>
          <div className="flex gap-2" role="group" aria-label="Office hours active days">
            {DAYS.map((day) => {
              const checked = activeDays.includes(day.value);
              return (
                <label
                  key={day.value}
                  className={cn(
                    'flex size-9 cursor-pointer items-center justify-center rounded-full border text-xs font-mono transition',
                    checked
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-input bg-background text-muted-foreground hover:text-foreground',
                    !enabled && 'cursor-not-allowed opacity-50'
                  )}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    disabled={!enabled}
                    onChange={() => void toggleOfficeHoursDay(day.value)}
                  />
                  {day.label}
                </label>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
