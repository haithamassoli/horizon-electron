import { AnimatePresence, motion } from 'motion/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useSettings } from '@/hooks/useSettings';
import { useSchedulerState } from '@/hooks/useSchedulerState';
import type { SnoozeCap } from '@shared/schemas';

const SESSION_OPTIONS: SnoozeCap[] = [1, 2, 3, 5, 'unlimited'];
const DAY_OPTIONS: SnoozeCap[] = [1, 3, 5, 10, 'unlimited'];

export function SnoozeSettings() {
  const { settings, ready, setSnoozePerSessionCap, setSnoozePerDayCap } = useSettings();
  const { state } = useSchedulerState();

  if (!ready || !settings) return null;

  return (
    <AnimatePresence initial={false}>
      {settings.enforcementMode !== 'hardcore' && (
        <motion.div
          key="snooze-settings"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <CardTitle>Snooze</CardTitle>
                  <CardDescription>
                    A 5-minute defer for breaks you can't take this instant. Caps keep snoozing
                    honest.
                  </CardDescription>
                </div>
                <UsageBadge
                  used={state?.snoozesUsedToday ?? 0}
                  session={state?.snoozesUsedThisSession ?? 0}
                />
              </div>
            </CardHeader>

            <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <CapField
                label="Per session"
                hint="Until you walk away."
                value={settings.snooze.perSessionCap}
                options={SESSION_OPTIONS}
                onChange={setSnoozePerSessionCap}
              />
              <CapField
                label="Per day"
                hint="Resets at local midnight."
                value={settings.snooze.perDayCap}
                options={DAY_OPTIONS}
                onChange={setSnoozePerDayCap}
              />
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface CapFieldProps {
  label: string;
  hint: string;
  value: SnoozeCap;
  options: SnoozeCap[];
  onChange: (cap: SnoozeCap) => Promise<void>;
}

function CapField({ label, hint, value, options, onChange }: CapFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-light">{label}</span>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {hint}
        </span>
      </div>
      <Select
        value={String(value)}
        onValueChange={(v) =>
          void onChange(v === 'unlimited' ? 'unlimited' : (Number(v) as SnoozeCap))
        }
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={String(opt)} value={String(opt)}>
              {opt === 'unlimited' ? 'Unlimited' : `${opt} per ${label.toLowerCase().replace('per ', '')}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function UsageBadge({ used, session }: { used: number; session: number }) {
  if (used === 0 && session === 0) {
    return (
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        no snoozes today
      </span>
    );
  }
  return (
    <motion.div
      key={`${used}-${session}`}
      initial={{ opacity: 0, y: -2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-end gap-0.5"
    >
      <span className="font-mono text-xs tabular-nums text-foreground/80">
        {used} today · {session} this session
      </span>
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        snoozes used
      </span>
    </motion.div>
  );
}
