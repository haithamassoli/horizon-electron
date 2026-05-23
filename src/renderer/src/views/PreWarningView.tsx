import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { PreWarningInitPayload } from '@shared/schemas';

type Status = 'loading' | 'visible' | 'closing';

export function PreWarningView() {
  const [init, setInit] = useState<PreWarningInitPayload | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    let mounted = true;
    void window.horizon.preWarning
      .init()
      .then((payload) => {
        if (!mounted) return;
        setInit(payload);
        setRemainingMs(Math.max(0, payload.fireAt - Date.now()));
        setStatus('visible');
      })
      .catch(() => {
        if (mounted) setStatus('closing');
      });

    const off = window.horizon.preWarning.onTick((payload) => {
      setRemainingMs(payload.remainingMs);
    });
    return () => {
      mounted = false;
      off();
    };
  }, []);

  function handleDismiss(): void {
    setStatus('closing');
    // Ack only. Main destroys the window after a short fade-out.
    setTimeout(() => void window.horizon.preWarning.dismiss(), 280);
  }

  const visible = status === 'visible' && init !== null;
  const seconds =
    remainingMs === null ? null : Math.max(0, Math.ceil(remainingMs / 1000));

  return (
    <div className="pre-warning-host">
      <AnimatePresence>
        {visible && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.99 }}
            transition={{
              type: 'spring',
              stiffness: 280,
              damping: 28,
              mass: 0.9
            }}
            className="pre-warning-card"
          >
            <div className="pre-warning-pulse" aria-hidden />
            <div className="relative flex h-full items-center gap-3 px-4">
              <div className="flex flex-1 flex-col">
                <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {init?.isLongBreak ? 'Long break soon' : 'Break soon'}
                </span>
                <span className="font-display text-lg leading-tight tracking-tight">
                  Break in {seconds ?? 60}s
                </span>
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Dismiss"
                className="pre-warning-dismiss"
              >
                <span aria-hidden>×</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
