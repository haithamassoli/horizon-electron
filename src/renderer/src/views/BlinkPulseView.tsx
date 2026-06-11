import { motion, useReducedMotion } from 'motion/react';

/**
 * Rendered inside a transparent, click-through window spawned per display by the main process.
 * The animation runs once on mount; the window is destroyed by main after a 1.3s safety timeout.
 *
 * Visual: a soft pair of blinking eyes with small irises and curved lashes. The pulse is a single
 * gentle blink, timed to disappear before the click-through window self-destroys.
 */
export function BlinkPulseView() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className="blink-pulse"
      initial={{ opacity: 0 }}
      animate={shouldReduceMotion ? { opacity: 0.9 } : { opacity: [0, 1, 1, 0] }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : {
              duration: 1.2,
              ease: [0.22, 1, 0.36, 1],
              times: [0, 0.18, 0.82, 1]
            }
      }
      aria-hidden="true"
    >
      <div className="blink-pulse-ambient" />
      <svg
        className="blink-eye-illustration"
        viewBox="0 0 168 92"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient
            id="blinkIris"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(27 22) rotate(90) scale(9)"
          >
            <stop stopColor="oklch(0.96 0.05 88)" />
            <stop offset="0.58" stopColor="oklch(0.74 0.11 145)" />
            <stop offset="1" stopColor="oklch(0.38 0.07 150)" />
          </radialGradient>
          <radialGradient
            id="blinkSclera"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(28 18) rotate(90) scale(26 31)"
          >
            <stop stopColor="oklch(1 0 0 / 0.98)" />
            <stop offset="1" stopColor="oklch(0.94 0.04 78 / 0.88)" />
          </radialGradient>
        </defs>

        <g className="blink-eye blink-eye-left" transform="translate(20 24)">
          <ellipse className="blink-eye-shadow" cx="28" cy="27" rx="31" ry="15" />
          <g className="blink-eye-form">
            <path className="blink-eye-sclera" d="M4 24C14 8 42 7 54 24C42 39 15 40 4 24Z" />
            <circle className="blink-iris" cx="29" cy="24" r="8.5" />
            <circle className="blink-pupil" cx="29" cy="24" r="3.6" />
            <circle className="blink-eye-highlight" cx="25.7" cy="20.4" r="2.2" />
            <path className="blink-eye-lid-line" d="M7 24C17 11 41 10 52 24" />
          </g>
          <g className="blink-eye-lashes">
            <path d="M12 21C7 17 4 12 4 7" />
            <path d="M27 14C24 8 25 4 29 1" />
            <path d="M42 15C47 10 50 6 54 3" />
          </g>
        </g>

        <g className="blink-eye blink-eye-right" transform="translate(94 24)">
          <ellipse className="blink-eye-shadow" cx="28" cy="27" rx="31" ry="15" />
          <g className="blink-eye-form">
            <path className="blink-eye-sclera" d="M4 24C14 8 42 7 54 24C42 39 15 40 4 24Z" />
            <circle className="blink-iris" cx="27" cy="24" r="8.5" />
            <circle className="blink-pupil" cx="27" cy="24" r="3.6" />
            <circle className="blink-eye-highlight" cx="23.7" cy="20.4" r="2.2" />
            <path className="blink-eye-lid-line" d="M7 24C17 11 41 10 52 24" />
          </g>
          <g className="blink-eye-lashes">
            <path d="M12 21C7 17 4 12 4 7" />
            <path d="M27 14C24 8 25 4 29 1" />
            <path d="M42 15C47 10 50 6 54 3" />
          </g>
        </g>
      </svg>
    </motion.div>
  );
}
