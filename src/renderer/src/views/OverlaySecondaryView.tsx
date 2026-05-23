import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { OverlayInitPayload, OverlayTickPayload } from '@shared/schemas';

type Phase = 'loading' | 'active' | 'closing';

export function OverlaySecondaryView() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [, setInit] = useState<OverlayInitPayload | null>(null);
  const [, setTick] = useState<OverlayTickPayload | null>(null);

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
        />
      )}
    </AnimatePresence>
  );
}
