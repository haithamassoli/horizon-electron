import { motion } from 'motion/react';

interface BreathingMarkProps {
  size?: number;
  className?: string;
}

/**
 * M1 Motion smoke test. A soft breathing ring — also the visual seed for the
 * full breathing-circle visual that lands on the break overlay in M7.
 */
export function BreathingMark({ size = 56, className }: BreathingMarkProps) {
  return (
    <div
      className={className}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <motion.div
        className="relative h-full w-full"
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      >
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, oklch(0.88 0.07 230 / 0.7), oklch(0.78 0.07 230 / 0.15) 60%, transparent 75%)'
          }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.7, 0.95, 0.7] }}
          transition={{ duration: 6, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
        />
        <motion.div
          className="absolute inset-[18%] rounded-full border border-primary/40"
          animate={{ scale: [1, 0.92, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
        />
      </motion.div>
    </div>
  );
}
