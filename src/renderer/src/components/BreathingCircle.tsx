import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

interface BreathingCircleProps {
  size?: number;
  /** When true (default), shows the small phase label ("Inhale", "Hold", "Exhale"). */
  showLabel?: boolean;
}

const INHALE_MS = 4_000;
const HOLD_MS = 7_000;
const EXHALE_MS = 8_000;
const CYCLE_MS = INHALE_MS + HOLD_MS + EXHALE_MS; // 19s

type Phase = 'inhale' | 'hold' | 'exhale';

function phaseAt(elapsedMs: number): { phase: Phase; phaseElapsedMs: number; phaseMs: number } {
  const t = elapsedMs % CYCLE_MS;
  if (t < INHALE_MS) return { phase: 'inhale', phaseElapsedMs: t, phaseMs: INHALE_MS };
  if (t < INHALE_MS + HOLD_MS)
    return { phase: 'hold', phaseElapsedMs: t - INHALE_MS, phaseMs: HOLD_MS };
  return { phase: 'exhale', phaseElapsedMs: t - INHALE_MS - HOLD_MS, phaseMs: EXHALE_MS };
}

const LABEL: Record<Phase, string> = {
  inhale: 'Inhale',
  hold: 'Hold',
  exhale: 'Exhale'
};

/**
 * 4-7-8 breathing visual. Scale runs 1 → 1.28 during inhale, holds, returns to 1
 * during exhale. The phase label is synced via JS time rather than relying on Motion's
 * keyframes (so the label change lands precisely at the phase boundary).
 */
export function BreathingCircle({ size = 320, showLabel = true }: BreathingCircleProps) {
  const startRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<Phase>('inhale');

  useEffect(() => {
    startRef.current = Date.now();
    const compute = (): void => {
      const start = startRef.current ?? Date.now();
      const next = phaseAt(Date.now() - start).phase;
      setPhase((prev) => (prev === next ? prev : next));
    };
    compute();
    const id = window.setInterval(compute, 250);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      aria-hidden
      className="breathing-circle"
      data-phase={phase}
      style={{ width: size, height: size }}
    >
      <motion.div
        className="breathing-circle-fill"
        animate={{
          scale: [1, 1.28, 1.28, 1],
          opacity: [0.65, 0.95, 0.95, 0.65]
        }}
        transition={{
          duration: CYCLE_MS / 1000,
          times: [0, INHALE_MS / CYCLE_MS, (INHALE_MS + HOLD_MS) / CYCLE_MS, 1],
          ease: 'easeInOut',
          repeat: Infinity
        }}
      />
      <motion.div
        className="breathing-circle-ring"
        animate={{
          scale: [1, 1.28, 1.28, 1],
          opacity: [0.45, 0.8, 0.8, 0.45]
        }}
        transition={{
          duration: CYCLE_MS / 1000,
          times: [0, INHALE_MS / CYCLE_MS, (INHALE_MS + HOLD_MS) / CYCLE_MS, 1],
          ease: 'easeInOut',
          repeat: Infinity
        }}
      />
      <motion.div
        className="breathing-circle-core"
        animate={{ opacity: [0.4, 0.85, 0.85, 0.4] }}
        transition={{
          duration: CYCLE_MS / 1000,
          times: [0, INHALE_MS / CYCLE_MS, (INHALE_MS + HOLD_MS) / CYCLE_MS, 1],
          ease: 'easeInOut',
          repeat: Infinity
        }}
      />
      {showLabel && (
        <motion.span
          key={phase}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.75 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="breathing-circle-label"
        >
          {LABEL[phase]}
        </motion.span>
      )}
    </div>
  );
}
