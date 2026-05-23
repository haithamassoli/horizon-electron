import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BreathingHalo } from '@/components/BreathingHalo';
import type {
  OverlayInitPayload,
  OverlaySnoozeResponse,
  OverlayTickPayload,
  SnoozeCaps
} from '@shared/schemas';

type Phase = 'loading' | 'active' | 'closing';
const PANIC_HOLD_MS = 5_000;

export function OverlayPrimaryView() {
  const [init, setInit] = useState<OverlayInitPayload | null>(null);
  const [tick, setTick] = useState<OverlayTickPayload | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [now, setNow] = useState<number>(() => Date.now());
  const [caps, setCaps] = useState<SnoozeCaps | null>(null);
  const [snoozeMessage, setSnoozeMessage] = useState<string | null>(null);
  const [panicProgress, setPanicProgress] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    void window.horizon.overlay
      .init()
      .then((payload) => {
        if (!mounted) return;
        setInit(payload);
        setCaps(payload.snoozeCaps);
        setPhase('active');
      })
      .catch(() => {
        if (mounted) setPhase('closing');
      });

    const off = window.horizon.overlay.onTick((payload) => {
      setTick(payload);
      if (payload.phase === 'closing') setPhase('closing');
    });
    return () => {
      mounted = false;
      off();
    };
  }, []);

  // High-resolution clock for lockout countdown.
  useEffect(() => {
    if (!init) return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [init]);

  const lockoutMs = init?.balancedLockoutMs ?? 0;
  const lockoutEndsAt = useMemo(() => (init ? init.startedAt + lockoutMs : 0), [init, lockoutMs]);
  const lockoutRemaining = Math.max(0, lockoutEndsAt - now);
  const inLockout = init?.mode === 'balanced' && lockoutRemaining > 0;

  const showActions = init && init.mode !== 'hardcore';
  const snoozeRemaining = caps?.perSessionRemaining ?? 'unlimited';
  const dayRemaining = caps?.perDayRemaining ?? 'unlimited';
  const snoozeCapHit =
    (typeof snoozeRemaining === 'number' && snoozeRemaining <= 0) ||
    (typeof dayRemaining === 'number' && dayRemaining <= 0);
  const snoozeReason =
    typeof snoozeRemaining === 'number' && snoozeRemaining <= 0
      ? 'Session snooze limit reached'
      : typeof dayRemaining === 'number' && dayRemaining <= 0
        ? 'Daily snooze limit reached'
        : null;

  // Keyboard skip (Casual + Balanced post-lockout).
  useEffect(() => {
    if (!init || init.mode === 'hardcore') return;
    const handler = (event: KeyboardEvent): void => {
      if (event.key !== ' ' && event.key !== 'Enter' && event.key !== 'Escape') return;
      event.preventDefault();
      if (inLockout) return;
      void requestSkip(init.sessionId);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [init, inLockout]);

  // Hardcore panic exit: Ctrl+Shift+Esc held 5s.
  usePanicExit(init, setPanicProgress);

  const remainingMs = tick?.remainingMs ?? init?.durationMs ?? 0;
  const totalMs = init?.durationMs ?? 1;
  const progress = useMemo(() => {
    if (!init) return 0;
    return Math.min(1, Math.max(0, 1 - remainingMs / totalMs));
  }, [init, remainingMs, totalMs]);

  async function handleSkip(): Promise<void> {
    if (!init || inLockout) return;
    await requestSkip(init.sessionId);
  }

  async function handleSnooze(): Promise<void> {
    if (!init || inLockout || snoozeCapHit) return;
    const res = await requestSnooze(init.sessionId);
    if (!res) return;
    if (res.accepted) {
      setCaps(res.snoozeCaps);
    } else {
      const msg =
        res.reason === 'cap-session'
          ? 'Session snooze limit reached'
          : res.reason === 'cap-day'
            ? 'Daily snooze limit reached'
            : 'Snooze unavailable';
      setSnoozeMessage(msg);
      window.setTimeout(() => setSnoozeMessage(null), 2_400);
    }
  }

  return (
    <AnimatePresence mode="wait">
      {phase !== 'closing' && init && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="overlay-primary"
        >
          <BackgroundField />

          <div className="overlay-content">
            <motion.span
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="overlay-kicker"
            >
              {init.isLongBreak ? 'Long break' : 'Take a moment'}
            </motion.span>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="overlay-stage"
            >
              <BreathingHalo size={320} />
              <span className="overlay-countdown font-display tabular-nums">
                {formatCountdown(remainingMs)}
              </span>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="overlay-prompt"
            >
              Soften your gaze. Look beyond the screen.
            </motion.p>

            <ProgressRail value={progress} />
          </div>

          {showActions && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="overlay-action-row"
            >
              <ActionButton
                label="Snooze 5 min"
                onClick={() => void handleSnooze()}
                disabled={inLockout || snoozeCapHit}
                lockoutRemaining={inLockout ? lockoutRemaining : 0}
                lockoutTotal={lockoutMs}
                tooltip={snoozeCapHit ? (snoozeReason ?? undefined) : undefined}
                kind="snooze"
              />
              <ActionButton
                label="Skip break"
                onClick={() => void handleSkip()}
                disabled={inLockout}
                lockoutRemaining={inLockout ? lockoutRemaining : 0}
                lockoutTotal={lockoutMs}
                keyHint="Esc"
                kind="skip"
              />
            </motion.div>
          )}

          <AnimatePresence>
            {snoozeMessage && (
              <motion.div
                key={snoozeMessage}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overlay-toast"
              >
                {snoozeMessage}
              </motion.div>
            )}
          </AnimatePresence>

          {init.mode === 'hardcore' && (
            <PanicHint progress={panicProgress} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  disabled: boolean;
  lockoutRemaining: number;
  lockoutTotal: number;
  tooltip?: string | undefined;
  keyHint?: string;
  kind: 'skip' | 'snooze';
}

function ActionButton({
  label,
  onClick,
  disabled,
  lockoutRemaining,
  lockoutTotal,
  tooltip,
  keyHint,
  kind
}: ActionButtonProps) {
  const inLockout = lockoutRemaining > 0;
  const lockoutSecs = Math.ceil(lockoutRemaining / 1000);
  const lockoutProgress =
    lockoutTotal > 0 ? Math.min(1, 1 - lockoutRemaining / lockoutTotal) : 1;
  const showTooltip = !!tooltip && disabled && !inLockout;

  return (
    <div className="overlay-action">
      <button
        type="button"
        className={
          'overlay-action-button ' +
          (kind === 'snooze' ? 'overlay-action-snooze' : 'overlay-action-skip') +
          (inLockout ? ' is-locked' : '') +
          (disabled && !inLockout ? ' is-disabled' : '')
        }
        onClick={onClick}
        disabled={disabled}
        aria-disabled={disabled}
        title={showTooltip ? tooltip : undefined}
      >
        <span className="overlay-action-label">
          {inLockout ? `${label} · ${lockoutSecs}s` : label}
        </span>
        {keyHint && !inLockout && (
          <span className="overlay-action-key" aria-hidden>
            {keyHint}
          </span>
        )}
        {inLockout && (
          <motion.span
            aria-hidden
            className="overlay-action-lockout-fill"
            animate={{ width: `${Math.round(lockoutProgress * 100)}%` }}
            transition={{ duration: 0.2, ease: 'linear' }}
          />
        )}
      </button>
      {showTooltip && (
        <span className="overlay-action-tooltip" role="status">
          {tooltip}
        </span>
      )}
    </div>
  );
}

function PanicHint({ progress }: { progress: number }) {
  const active = progress > 0;
  return (
    <div className="overlay-panic-hint" aria-live="polite">
      <span className="overlay-panic-keys">Ctrl + Shift + Esc</span>
      <span className="overlay-panic-label">
        {active ? `Hold to exit · ${Math.ceil((1 - progress) * 5)}s` : 'Hold 5s to exit'}
      </span>
      <div className="overlay-panic-bar" aria-hidden>
        <motion.div
          className="overlay-panic-bar-fill"
          animate={{ width: `${Math.round(progress * 100)}%` }}
          transition={{ duration: 0.1, ease: 'linear' }}
        />
      </div>
    </div>
  );
}

function usePanicExit(
  init: OverlayInitPayload | null,
  setProgress: (n: number) => void
): void {
  const holdStart = useRef<number | null>(null);
  const rafHandle = useRef<number | null>(null);
  const keysHeld = useRef<{ ctrl: boolean; shift: boolean; esc: boolean }>({
    ctrl: false,
    shift: false,
    esc: false
  });

  useEffect(() => {
    if (!init || init.mode !== 'hardcore') return;
    const sessionId = init.sessionId;

    function checkCombo(): boolean {
      return keysHeld.current.ctrl && keysHeld.current.shift && keysHeld.current.esc;
    }

    function loop(): void {
      const start = holdStart.current;
      if (start === null) {
        setProgress(0);
        return;
      }
      const elapsed = Date.now() - start;
      const p = Math.min(1, elapsed / PANIC_HOLD_MS);
      setProgress(p);
      if (p >= 1) {
        holdStart.current = null;
        void window.horizon.overlay.panic(sessionId);
        return;
      }
      rafHandle.current = window.requestAnimationFrame(loop);
    }

    function start(): void {
      if (holdStart.current !== null) return;
      holdStart.current = Date.now();
      rafHandle.current = window.requestAnimationFrame(loop);
    }

    function cancel(): void {
      holdStart.current = null;
      if (rafHandle.current !== null) {
        window.cancelAnimationFrame(rafHandle.current);
        rafHandle.current = null;
      }
      setProgress(0);
    }

    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Control') keysHeld.current.ctrl = true;
      if (e.key === 'Shift') keysHeld.current.shift = true;
      if (e.key === 'Escape') keysHeld.current.esc = true;
      if (checkCombo()) start();
    }

    function onKeyUp(e: KeyboardEvent): void {
      if (e.key === 'Control') keysHeld.current.ctrl = false;
      if (e.key === 'Shift') keysHeld.current.shift = false;
      if (e.key === 'Escape') keysHeld.current.esc = false;
      if (!checkCombo()) cancel();
    }

    function onBlur(): void {
      keysHeld.current = { ctrl: false, shift: false, esc: false };
      cancel();
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      cancel();
    };
  }, [init, setProgress]);
}

async function requestSkip(sessionId: string): Promise<void> {
  try {
    await window.horizon.overlay.skip(sessionId);
  } catch {
    // ignore — main is authoritative
  }
}

async function requestSnooze(sessionId: string): Promise<OverlaySnoozeResponse | null> {
  try {
    return await window.horizon.overlay.snooze(sessionId);
  } catch {
    return null;
  }
}

function ProgressRail({ value }: { value: number }) {
  return (
    <div className="overlay-progress" role="presentation" aria-hidden>
      <motion.div
        className="overlay-progress-fill"
        animate={{ width: `${Math.round(value * 100)}%` }}
        transition={{ duration: 0.8, ease: 'linear' }}
      />
    </div>
  );
}

function BackgroundField() {
  return (
    <>
      <motion.div
        aria-hidden
        className="overlay-bg-warm"
        animate={{
          opacity: [0.7, 0.95, 0.7],
          backgroundPosition: ['0% 30%', '40% 50%', '0% 30%']
        }}
        transition={{ duration: 24, ease: 'easeInOut', repeat: Infinity }}
      />
      <motion.div
        aria-hidden
        className="overlay-bg-cool"
        animate={{
          opacity: [0.5, 0.85, 0.5],
          backgroundPosition: ['100% 70%', '60% 40%', '100% 70%']
        }}
        transition={{ duration: 30, ease: 'easeInOut', repeat: Infinity }}
      />
      <div aria-hidden className="overlay-bg-vignette" />
    </>
  );
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? `0${s}` : s}`;
}
