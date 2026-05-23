import { motion } from 'motion/react';

/**
 * Rendered inside a transparent, click-through window spawned per display by the main process.
 * The animation runs once on mount; the window is destroyed by main after a 1.3s safety timeout.
 *
 * Visual: a thin light-blue ring traced at the screen edges with a soft inner glow. The pulse is
 * a single breath — opacity 0 → 0.35 → 0 over 1.2s ease-in-out.
 */
export function BlinkPulseView() {
  return (
    <motion.div
      className="blink-pulse"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.35, 0] }}
      transition={{
        duration: 1.2,
        ease: [0.42, 0, 0.58, 1],
        times: [0, 0.5, 1]
      }}
      aria-hidden="true"
    >
      <div className="blink-pulse-glow" />
      <div className="blink-pulse-ring" />
    </motion.div>
  );
}
