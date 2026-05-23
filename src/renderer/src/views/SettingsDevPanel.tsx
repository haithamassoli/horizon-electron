import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useSettings } from '@/hooks/useSettings';
import type { EnforcementMode } from '@shared/schemas';

const modeOptions: { value: EnforcementMode; label: string; hint: string }[] = [
  { value: 'casual', label: 'Casual', hint: 'Skip anytime' },
  { value: 'balanced', label: 'Balanced', hint: '7-second pause before skip' },
  { value: 'hardcore', label: 'Hardcore', hint: 'Commit to the break' }
];

export function SettingsDevPanel() {
  const { settings, ready, eventCount, lastEventAt, error, setInterval, setEnforcementMode, setBlinkEnabled } =
    useSettings();
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const relativeAgo = formatRelative(lastEventAt, now);

  if (!ready || !settings) {
    return (
      <Card>
        <CardContent className="flex h-32 items-center justify-center text-sm font-light text-muted-foreground">
          {error ?? 'Connecting to main process…'}
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <CardTitle>Live IPC round-trip</CardTitle>
              <CardDescription>
                Edit. Watch the value flow renderer → main → electron-store → subscribe →
                renderer.
              </CardDescription>
            </div>
            <EchoBadge eventCount={eventCount} relativeAgo={relativeAgo} />
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-8">
          <Field
            label="Break interval"
            value={`${settings.breaks.intervalMinutes} min`}
          >
            <Slider
              min={5}
              max={60}
              step={1}
              value={[settings.breaks.intervalMinutes]}
              onValueChange={([v]) => v !== undefined && setInterval(v)}
            />
          </Field>

          <Field label="Enforcement mode" value={settings.enforcementMode}>
            <Select
              value={settings.enforcementMode}
              onValueChange={(v) => setEnforcementMode(v as EnforcementMode)}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modeOptions.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    <span className="font-light">{m.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">— {m.hint}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Blink reminder"
            value={settings.blink.enabled ? 'On' : 'Off'}
            inline
          >
            <Switch
              checked={settings.blink.enabled}
              onCheckedChange={(v) => setBlinkEnabled(v)}
            />
          </Field>
        </CardContent>
      </Card>

      <StoreSnapshot raw={settings} />
    </section>
  );
}

interface FieldProps {
  label: string;
  value: string;
  inline?: boolean;
  children: ReactNode;
}

function Field({ label, value, inline, children }: FieldProps) {
  if (inline) {
    return (
      <div className="flex items-center justify-between gap-6">
        <div>
          <div className="text-sm font-light">{label}</div>
          <div className="text-xs text-muted-foreground">{value}</div>
        </div>
        {children}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-light">{label}</span>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">{value}</span>
      </div>
      {children}
    </div>
  );
}

function EchoBadge({ eventCount, relativeAgo }: { eventCount: number; relativeAgo: string }) {
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <motion.span
          key={eventCount}
          initial={{ scale: 1.4, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_0_4px_oklch(0.78_0.07_230_/_0.25)]"
        />
        <span className="font-mono text-xs tabular-nums text-foreground/80">
          {eventCount} echo{eventCount === 1 ? '' : 'es'}
        </span>
      </div>
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {relativeAgo}
      </span>
    </div>
  );
}

function formatRelative(lastEventAt: number | null, now: number): string {
  if (!lastEventAt) return '—';
  const ms = now - lastEventAt;
  if (ms < 1000) return 'just now';
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  return `${Math.floor(ms / 60_000)}m ago`;
}

function StoreSnapshot({ raw }: { raw: object }) {
  const json = JSON.stringify(raw, null, 2);
  return (
    <Card className="bg-muted/40">
      <CardHeader>
        <CardTitle className="text-sm">electron-store snapshot</CardTitle>
        <CardDescription className="text-xs">
          The exact persisted object. Updates on every broadcast.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          <motion.pre
            key={json}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="max-h-72 overflow-auto rounded-md border border-border/60 bg-background/60 p-4 font-mono text-[11px] leading-relaxed text-foreground/80"
          >
            {json}
          </motion.pre>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
