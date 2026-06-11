import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { OverlayInitPayload, OverlayTickPayload } from '@shared/schemas';

type Phase = 'loading' | 'active' | 'closing';

export function OverlaySecondaryView() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [init, setInit] = useState<OverlayInitPayload | null>(null);
  const [tick, setTick] = useState<OverlayTickPayload | null>(null);

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

  return (
    <AnimatePresence mode="wait">
      {phase !== 'closing' && (
        <motion.div
          key="dim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="overlay-secondary"
        >
          <div className="overlay-secondary-field" aria-hidden />
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="overlay-secondary-card"
          >
            <span className="overlay-secondary-title">Break in progress</span>
            <span className="overlay-secondary-subtitle">This display is softly locked</span>
            {init && (
              <span className="overlay-secondary-countdown">
                {formatCountdown(tick?.remainingMs ?? init.durationMs)}
              </span>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? `0${s}` : s}`;
}
