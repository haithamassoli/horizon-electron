import { motion } from 'motion/react';

interface BreathingMarkProps {
  size?: number;
  className?: string;
}

/**
 * A soft breathing ring used as the app's calm visual mark.
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
              'radial-gradient(circle at 30% 30%, oklch(0.94 0.09 58 / 0.78), oklch(0.78 0.08 145 / 0.18) 62%, transparent 76%)'
          }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.7, 0.95, 0.7] }}
          transition={{ duration: 6, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
        />
        <motion.div
          className="absolute inset-[18%] rounded-full border border-primary/35 shadow-[0_0_28px_oklch(0.82_0.1_48_/_0.18)]"
          animate={{ scale: [1, 0.92, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
        />
      </motion.div>
    </div>
  );
}
