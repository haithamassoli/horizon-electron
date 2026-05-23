import { motion } from 'motion/react';

interface BreathingHaloProps {
  size?: number;
}

/**
 * M3 placeholder visual for the break overlay center. A soft pulsing halo.
 * The 4-7-8 breathing pattern logic lands in M7; for now this is purely ambient.
 */
export function BreathingHalo({ size = 260 }: BreathingHaloProps) {
  return (
    <div
      aria-hidden
      className="relative"
      style={{ width: size, height: size }}
    >
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, oklch(0.92 0.07 230 / 0.55), oklch(0.78 0.07 230 / 0.18) 55%, transparent 75%)',
          filter: 'blur(2px)'
        }}
        animate={{
          scale: [1, 1.12, 1.12, 1],
          opacity: [0.6, 0.92, 0.92, 0.6]
        }}
        transition={{
          duration: 12,
          times: [0, 0.32, 0.64, 1],
          ease: 'easeInOut',
          repeat: Infinity
        }}
      />
      <motion.div
        className="absolute inset-[14%] rounded-full border border-primary/35"
        animate={{ scale: [1, 0.92, 0.92, 1] }}
        transition={{
          duration: 12,
          times: [0, 0.32, 0.64, 1],
          ease: 'easeInOut',
          repeat: Infinity
        }}
      />
      <motion.div
        className="absolute inset-[28%] rounded-full"
        style={{
          background:
            'radial-gradient(circle, oklch(0.99 0.005 230 / 0.5), transparent 70%)'
        }}
        animate={{ opacity: [0.4, 0.8, 0.8, 0.4] }}
        transition={{
          duration: 12,
          times: [0, 0.32, 0.64, 1],
          ease: 'easeInOut',
          repeat: Infinity
        }}
      />
    </div>
  );
}
