import { getScheduler } from '../scheduler/scheduler';
import { isOverlayActive } from '../windows/overlay-manager';
import { IdleMonitor } from './idle-monitor';
import { SuppressionGate } from './suppression-gate';

let idleInstance: IdleMonitor | undefined;
let gateInstance: SuppressionGate | undefined;

export function getIdleMonitor(): IdleMonitor {
  if (!idleInstance) idleInstance = new IdleMonitor();
  return idleInstance;
}

export function getSuppressionGate(): SuppressionGate {
  if (!gateInstance) {
    gateInstance = new SuppressionGate({
      // During a break, fullscreen / meeting transitions don't change scheduler behavior — silence
      // the gate to keep state clean.
      isQuiet: () => isOverlayActive()
    });
  }
  return gateInstance;
}

/**
 * Boot M5 monitors and wire them to the scheduler. Returns a teardown function for `before-quit`.
 */
export async function startActivityMonitors(): Promise<() => void> {
  const idle = getIdleMonitor();
  const gate = getSuppressionGate();
  const scheduler = getScheduler();

  const onIdle = (): void => scheduler.notifyIdleDetected(idle.getThresholdSeconds());
  const onActive = (): void => scheduler.notifyActivityResumed();
  idle.on('idle-detected', onIdle);
  idle.on('activity-resumed', onActive);

  const onSuppression = (s: { suppressed: boolean; reason: 'meeting' | 'fullscreen' | null }): void => {
    scheduler.notifySuppressionChanged(s.suppressed, s.reason);
  };
  gate.on('suppression-changed', onSuppression);

  // Adaptive poll: tighten fullscreen polling during the 60s pre-warning window.
  const unsubscribeScheduler = scheduler.on((event) => {
    if (event.type === 'pre-warning-due') {
      gate.setHighFrequency(true);
    } else if (event.type === 'break-due' || event.type === 'state-changed') {
      // Drop back to 5s once a break has started or the warning window is gone.
      if (event.type === 'break-due') {
        gate.setHighFrequency(false);
      } else if (event.state.lifecycle !== 'running' || event.state.nextBreakAt === null) {
        gate.setHighFrequency(false);
      } else {
        const remaining = event.state.nextBreakAt - Date.now();
        if (remaining > 60_000) gate.setHighFrequency(false);
      }
    }
  });

  idle.start();
  await gate.start();

  return () => {
    idle.off('idle-detected', onIdle);
    idle.off('activity-resumed', onActive);
    gate.off('suppression-changed', onSuppression);
    unsubscribeScheduler();
    idle.stop();
    gate.stop();
    idleInstance = undefined;
    gateInstance = undefined;
  };
}

export { IdleMonitor } from './idle-monitor';
export { FullscreenMonitor } from './fullscreen-monitor';
export { MeetingMonitor } from './meeting-monitor';
export { SuppressionGate, type SuppressionState } from './suppression-gate';
