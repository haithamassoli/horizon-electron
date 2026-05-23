import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BreathingHalo } from '@/components/BreathingHalo';
import type { OverlayInitPayload, OverlayTickPayload } from '@shared/schemas';

type Phase = 'loading' | 'active' | 'closing';

export function OverlayPrimaryView() {
  const [init, setInit] = useState<OverlayInitPayload | null>(null);
  const [tick, setTick] = useState<OverlayTickPayload | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');

  useEffect(() => {
    let mounted = true;
    void window.horizon.overlay
      .init()
      .then((payload) => {
        if (!mounted) return;
        setInit(payload);
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

  const skipAllowed = init?.mode === 'casual';

  useEffect(() => {
    if (!init || !skipAllowed) return;
    const handler = (event: KeyboardEvent): void => {
      if (event.key === ' ' || event.key === 'Enter' || event.key === 'Escape') {
        event.preventDefault();
        void requestSkip(init.sessionId);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [init, skipAllowed]);

  const remainingMs = tick?.remainingMs ?? init?.durationMs ?? 0;
  const totalMs = init?.durationMs ?? 1;
  const progress = useMemo(() => {
    if (!init) return 0;
    return Math.min(1, Math.max(0, 1 - remainingMs / totalMs));
  }, [init, remainingMs, totalMs]);

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

          {skipAllowed && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="overlay-skip-row"
            >
              <button
                type="button"
                className="overlay-skip-button"
                onClick={() => void requestSkip(init.sessionId)}
              >
                Skip break
                <span className="overlay-skip-key" aria-hidden>
                  Esc
                </span>
              </button>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

async function requestSkip(sessionId: string): Promise<void> {
  try {
    await window.horizon.overlay.skip(sessionId);
  } catch {
    // ignore — main is authoritative
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
