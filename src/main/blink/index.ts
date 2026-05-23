import { getScheduler } from '../scheduler/scheduler';
import { getSuppressionGate } from '../activity';
import { isOverlayActive } from '../windows/overlay-manager';
import { BlinkScheduler } from './blink-scheduler';
import { destroyAllBlinkPulses, spawnBlinkPulse } from './blink-window';

let blink: BlinkScheduler | undefined;

/**
 * Boot the blink reminder module. Returns a teardown function for `before-quit`.
 *
 * Suppression layers ORed in `shouldSuppress`:
 *   - SuppressionGate (M5 fullscreen / meeting active)
 *   - Scheduler lifecycle in paused / idle / suppressed / outside-office-hours
 *   - An active break overlay (defensive — no point pulsing under a full-screen break)
 *
 * Silent skips — never queued, never deferred (per spec).
 */
export function startBlinkModule(): () => void {
  if (blink) return () => {};

  blink = new BlinkScheduler({
    shouldSuppress: () => {
      if (getSuppressionGate().getState().suppressed) return true;
      if (isOverlayActive()) return true;
      const lifecycle = getScheduler().getState().lifecycle;
      return lifecycle !== 'running';
    }
  });

  const onBlinkDue = (): void => spawnBlinkPulse();
  blink.on('blink-due', onBlinkDue);
  blink.start();

  return () => {
    blink?.off('blink-due', onBlinkDue);
    blink?.stop();
    blink = undefined;
    destroyAllBlinkPulses();
  };
}

export { BlinkScheduler } from './blink-scheduler';
export { spawnBlinkPulse, destroyAllBlinkPulses } from './blink-window';
