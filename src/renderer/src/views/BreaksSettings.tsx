import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/hooks/useSettings';

export function BreaksSettings() {
  const {
    settings,
    ready,
    setInterval,
    setShortDurationSeconds,
    setLongCadence,
    setLongDurationMinutes
  } = useSettings();

  if (!ready || !settings) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <CardTitle>Breaks</CardTitle>
            <CardDescription>
              Cadence and duration. Changes apply live — the next break recomputes from the new
              interval.
            </CardDescription>
          </div>
          <BreakTriggerButton />
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-9">
        <Slot
          label="Break interval"
          hint="How often a short break fires while you're active."
          value={`${settings.breaks.intervalMinutes} min`}
        >
          <Slider
            min={5}
            max={60}
            step={1}
            value={[settings.breaks.intervalMinutes]}
            onValueChange={([v]) => v !== undefined && void setInterval(v)}
          />
          <Scale labels={['5', '20', '40', '60 min']} />
        </Slot>

        <Slot
          label="Short break duration"
          hint="Length of a regular break."
          value={`${settings.breaks.shortDurationSeconds} sec`}
        >
          <Slider
            min={15}
            max={120}
            step={5}
            value={[settings.breaks.shortDurationSeconds]}
            onValueChange={([v]) => v !== undefined && void setShortDurationSeconds(v)}
          />
          <Scale labels={['15s', '60s', '120s']} />
        </Slot>

        <Slot
          label="Long break cadence"
          hint="Every Nth break becomes a long break."
          value={`Every ${settings.breaks.longCadence}`}
        >
          <Slider
            min={2}
            max={10}
            step={1}
            value={[settings.breaks.longCadence]}
            onValueChange={([v]) => v !== undefined && void setLongCadence(v)}
          />
          <Scale labels={['2nd', '6th', '10th']} />
        </Slot>

        <Slot
          label="Long break duration"
          hint="Length of a long break when it lands."
          value={`${settings.breaks.longDurationMinutes} min`}
        >
          <Slider
            min={1}
            max={10}
            step={1}
            value={[settings.breaks.longDurationMinutes]}
            onValueChange={([v]) => v !== undefined && void setLongDurationMinutes(v)}
          />
          <Scale labels={['1m', '5m', '10m']} />
        </Slot>
      </CardContent>
    </Card>
  );
}

interface SlotProps {
  label: string;
  value: string;
  hint?: string;
  children: ReactNode;
}

function Slot({ label, value, hint, children }: SlotProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-6">
        <div className="flex flex-col">
          <span className="text-sm font-light">{label}</span>
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </div>
        <motion.span
          key={value}
          initial={{ opacity: 0.6, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="font-mono text-xs tabular-nums text-foreground/80"
        >
          {value}
        </motion.span>
      </div>
      {children}
    </div>
  );
}

function Scale({ labels }: { labels: string[] }) {
  return (
    <div className="flex justify-between px-0.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
      {labels.map((l) => (
        <span key={l}>{l}</span>
      ))}
    </div>
  );
}

function BreakTriggerButton() {
  const [busy, setBusy] = useState(false);
  const [lastFiredAt, setLastFiredAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  async function fire() {
    if (busy) return;
    setBusy(true);
    try {
      await window.horizon.tray.dispatch('break-now');
      setLastFiredAt(Date.now());
    } finally {
      setBusy(false);
    }
  }

  const since = lastFiredAt === null ? null : Math.floor((now - lastFiredAt) / 1000);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="outline" onClick={() => void fire()} disabled={busy}>
        Preview overlay
      </Button>
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {since === null ? 'spawns full-screen' : since < 1 ? 'just fired' : `${since}s ago`}
      </span>
    </div>
  );
}
