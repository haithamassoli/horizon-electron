import { motion } from 'motion/react';

interface TwentyTwentyTwentyProps {
  size?: number;
}

export function TwentyTwentyTwenty({ size = 320 }: TwentyTwentyTwentyProps) {
  return (
    <div
      aria-hidden
      className="twentytwentytwenty"
      style={{ width: size, height: size }}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="twentytwentytwenty-rule"
        aria-hidden
      />
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="twentytwentytwenty-stack"
      >
        <span className="twentytwentytwenty-eyebrow">20 · 20 · 20</span>
        <p className="twentytwentytwenty-prompt">
          Look at something <span>20 feet away</span> for <span>20 seconds</span>.
        </p>
      </motion.div>
    </div>
  );
}
