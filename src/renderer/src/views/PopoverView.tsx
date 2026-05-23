import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useSchedulerState } from '@/hooks/useSchedulerState';
import type { SchedulerState } from '@shared/schemas';

export function PopoverView() {
  const { state } = useSchedulerState();
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="popover-shell">
      <motion.div
        initial={{ opacity: 0, y: 6, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="popover-card"
      >
        <PopoverBody state={state} now={now} />
      </motion.div>
    </div>
  );
}

function PopoverBody({ state, now }: { state: SchedulerState | null; now: number }) {
  if (!state) {
    return (
      <div className="flex h-full flex-col justify-center gap-1 px-5 py-4">
        <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Horizon
        </span>
        <span className="font-display text-xl italic text-muted-foreground">syncing…</span>
      </div>
    );
  }

  const view = derive(state, now);

  return (
    <div className="relative flex h-full flex-col gap-3 px-5 py-4">
      <header className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Horizon
        </span>
        <StatusDot lifecycle={state.lifecycle} />
      </header>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={view.key}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-1 flex-col justify-center"
        >
          <span className="text-xs font-light text-muted-foreground">{view.label}</span>
          <span className="mt-0.5 font-display text-[28px] leading-[1.1] tracking-tight tabular-nums">
            {view.value}
          </span>
        </motion.div>
      </AnimatePresence>

      {view.hint && (
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">
          {view.hint}
        </p>
      )}
    </div>
  );
}

function StatusDot({ lifecycle }: { lifecycle: SchedulerState['lifecycle'] }) {
  const active = lifecycle === 'running';
  return (
    <span className="relative inline-flex h-2 w-2">
      {active && (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full bg-primary/40"
          animate={{ scale: [1, 1.9, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
        />
      )}
      <span
        className={
          'relative inline-block h-2 w-2 rounded-full ' +
          (lifecycle === 'paused'
            ? 'bg-muted-foreground/50'
            : lifecycle === 'outside-office-hours'
              ? 'bg-muted-foreground/30'
              : 'bg-primary')
        }
      />
    </span>
  );
}

interface DerivedView {
  key: string;
  label: string;
  value: string;
  hint?: string;
}

function derive(state: SchedulerState, now: number): DerivedView {
  if (state.lifecycle === 'paused' && state.pausedUntil !== null) {
    return {
      key: 'paused',
      label: 'Paused until',
      value: formatClock(state.pausedUntil),
      hint: formatPauseRemaining(state.pausedUntil - now)
    };
  }
  if (state.lifecycle === 'outside-office-hours') {
    return {
      key: 'office',
      label: 'Quiet hours',
      value: 'outside office hours',
      hint: 'Resumes at start of next window'
    };
  }
  if (state.lifecycle === 'suppressed') {
    return {
      key: 'suppressed',
      label: 'Deferred',
      value: 'meeting active',
      hint: 'Resumes when activity ends'
    };
  }
  if (state.lifecycle === 'running' && state.nextBreakAt !== null) {
    const ms = state.nextBreakAt - now;
    const base: DerivedView = {
      key: 'running',
      label: 'Next break in',
      value: formatCountdown(ms)
    };
    return state.isNextLong ? { ...base, hint: 'Long break next' } : base;
  }
  return { key: 'idle', label: 'Status', value: '—' };
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit'
  });
}

function formatPauseRemaining(ms: number): string {
  if (ms <= 0) return 'resuming…';
  const totalMin = Math.ceil(ms / 60_000);
  if (totalMin < 60) return `${totalMin} min remaining`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `${h}h remaining` : `${h}h ${m}m remaining`;
}
