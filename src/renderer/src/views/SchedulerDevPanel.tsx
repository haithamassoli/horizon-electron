import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSchedulerState } from '@/hooks/useSchedulerState';
import type { SchedulerEvent, SchedulerState, TrayAction } from '@shared/schemas';

const ACTIONS: { action: TrayAction; label: string; variant?: 'default' | 'outline' | 'ghost' }[] = [
  { action: 'break-now', label: 'Break now' },
  { action: 'skip-next', label: 'Skip next', variant: 'outline' },
  { action: 'pause-15m', label: 'Pause 15m', variant: 'outline' },
  { action: 'pause-30m', label: 'Pause 30m', variant: 'outline' },
  { action: 'pause-1h', label: 'Pause 1h', variant: 'outline' },
  { action: 'pause-until-tomorrow', label: 'Until tomorrow', variant: 'outline' },
  { action: 'resume', label: 'Resume', variant: 'ghost' }
];

export function SchedulerDevPanel() {
  const { state, events, clearEvents } = useSchedulerState({ collectEvents: true });
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <CardTitle>Scheduler — live</CardTitle>
              <CardDescription>
                Tick stream from the main process. Dispatch tray actions inline to verify the
                state machine without using the tray.
              </CardDescription>
            </div>
            <LifecyclePill state={state} />
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-8">
          <CountdownReadout state={state} now={now} />

          <div className="flex flex-wrap gap-2">
            {ACTIONS.map((a) => (
              <Button
                key={a.action}
                size="sm"
                variant={a.variant ?? 'default'}
                onClick={() => void window.horizon.tray.dispatch(a.action)}
              >
                {a.label}
              </Button>
            ))}
          </div>

          <EventLog events={events} now={now} onClear={clearEvents} />
        </CardContent>
      </Card>
    </section>
  );
}

function LifecyclePill({ state }: { state: SchedulerState | null }) {
  if (!state) return null;
  const tone =
    state.lifecycle === 'running'
      ? 'bg-primary/20 text-primary-foreground/90 border-primary/30'
      : state.lifecycle === 'paused'
        ? 'bg-muted text-muted-foreground border-border'
        : 'bg-secondary text-secondary-foreground border-border';
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em] ' +
        tone
      }
    >
      <span
        className={
          'inline-block h-1.5 w-1.5 rounded-full ' +
          (state.lifecycle === 'running' ? 'bg-primary' : 'bg-muted-foreground/70')
        }
      />
      {state.lifecycle}
    </span>
  );
}

function CountdownReadout({ state, now }: { state: SchedulerState | null; now: number }) {
  if (!state) return null;
  if (state.lifecycle === 'paused' && state.pausedUntil) {
    return (
      <Field label="Paused until" value={new Date(state.pausedUntil).toLocaleTimeString()}>
        <span className="font-display text-3xl tracking-tight">
          {humanRemaining(state.pausedUntil - now)}
        </span>
      </Field>
    );
  }
  if (state.lifecycle === 'running' && state.nextBreakAt) {
    return (
      <Field
        label={state.isNextLong ? 'Next (long) break in' : 'Next break in'}
        value={new Date(state.nextBreakAt).toLocaleTimeString()}
      >
        <span className="font-display text-3xl tabular-nums tracking-tight">
          {countdown(state.nextBreakAt - now)}
        </span>
      </Field>
    );
  }
  return (
    <Field label="Status" value={state.lifecycle}>
      <span className="font-display text-3xl italic text-muted-foreground">idle</span>
    </Field>
  );
}

function Field({
  label,
  value,
  children
}: {
  label: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{value}</span>
      </div>
      {children}
    </div>
  );
}

function EventLog({
  events,
  now,
  onClear
}: {
  events: SchedulerEvent[];
  now: number;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Event stream
        </span>
        <button
          type="button"
          onClick={onClear}
          className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors"
        >
          clear
        </button>
      </div>
      <div className="max-h-64 overflow-auto rounded-md border border-border/60 bg-background/60 p-2">
        {events.length === 0 ? (
          <p className="px-2 py-3 text-xs font-light text-muted-foreground">
            No events yet. Dispatch an action or wait for a tick.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            <AnimatePresence initial={false}>
              {events.map((e, idx) => (
                <motion.li
                  key={`${e.at}-${idx}-${e.type}`}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="grid grid-cols-[88px_120px_1fr] items-baseline gap-3 px-2 py-1 font-mono text-[11px] leading-relaxed"
                >
                  <span className="text-muted-foreground tabular-nums">
                    {agoLabel(now - e.at)}
                  </span>
                  <span
                    className={
                      e.type === 'break-due'
                        ? 'font-medium text-primary-foreground/90'
                        : e.type === 'pre-warning-due'
                          ? 'text-foreground/90'
                          : 'text-muted-foreground'
                    }
                  >
                    {e.type}
                  </span>
                  <span className="truncate text-muted-foreground">{describe(e)}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}

function countdown(ms: number): string {
  if (ms <= 0) return '0:00';
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function humanRemaining(ms: number): string {
  if (ms <= 0) return 'resuming…';
  const min = Math.ceil(ms / 60_000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function agoLabel(ms: number): string {
  if (ms < 1000) return 'now';
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  return `${Math.floor(ms / 60_000)}m ago`;
}

function describe(e: SchedulerEvent): string {
  switch (e.type) {
    case 'state-changed':
      return `${e.state.lifecycle}${e.state.suppressionReason ? `:${e.state.suppressionReason}` : ''} · counter=${e.state.longBreakCounter}${e.state.isNextLong ? ' · long-next' : ''}${e.state.deferredBreak ? ' · deferred' : ''}`;
    case 'pre-warning-due':
      return `${e.payload.isLongBreak ? 'long' : 'short'} · fires @${new Date(e.payload.fireAt).toLocaleTimeString()}`;
    case 'break-due':
      return `${e.payload.isLongBreak ? 'long' : 'short'} · ${Math.round(e.payload.durationMs / 1000)}s${e.payload.manual ? ' · manual' : ''}`;
    case 'pause-expired':
      return `paused ${Math.round((e.payload.pausedUntil - e.payload.pausedAt) / 60_000)}m`;
    case 'snooze-used':
      return `+${Math.round(e.payload.deferMs / 60_000)}m · session=${e.payload.snoozesUsedThisSession} · day=${e.payload.snoozesUsedToday}`;
    case 'snooze-rejected':
      return `rejected · ${e.payload.reason}`;
    case 'idle-detected':
      return `threshold=${e.payload.idleThresholdSeconds}s`;
    case 'activity-resumed':
      return `idle=${Math.round(e.payload.idleDurationMs / 1000)}s`;
    case 'suppression-changed':
      return e.payload.suppressed
        ? `on · ${e.payload.reason ?? '?'}`
        : 'off';
    case 'break-deferred':
      return `${e.payload.isLongBreak ? 'long' : 'short'} · ${e.payload.reason}`;
  }
}
