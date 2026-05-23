# Scheduler — state machine

Single source of truth for break + tray state. Lives in main, drives overlays (M3), blink (M6), tray popover (M2). Emits typed events; consumers subscribe.

## States

| State | Meaning |
|------|---------|
| `running` | Normal countdown to `nextBreakAt`. Idle / fullscreen / meeting monitors may transition out. |
| `paused` | User-initiated. Has `pausedUntil` epoch ms. On expiry → reset (`nextBreakAt = now + interval`) → `running`. |
| `suppressed` | Activity monitor forced (idle / fullscreen / meeting). Timer halted. May hold one `deferredBreak`. Wired in M5; in M2 we model the field but no transitions yet. |
| `outside-office-hours` | Office-hours gate (M8). Timer halted. M2 leaves placeholder. |

## Cross-state fields

- `nextBreakAt: number | null` — epoch ms. `null` when `paused` / `suppressed` / `outside-office-hours`.
- `pausedUntil: number | null` — epoch ms. Only set while `paused`.
- `longBreakCounter: number` — increments on every short break completed (or skipped). When `(longBreakCounter % longCadence) === 0` the next break is long.
- `isNextLong: boolean` — derived; surfaced in `state-changed` payload for consumers.
- `lastBreakAt: number | null` — epoch ms. Persisted; used on launch to schedule the next break sanely.
- `deferredBreak: boolean` — M5 single-slot queue.

## Transitions

```
                 settings change
   ┌─────────────────────────────────────┐
   ▼                                     │
[running] ─ tray:pause(d) ──► [paused] (pausedUntil = now + d)
   │                            │
   │ break-due fires            │ auto-expiry  ───► reset to running, nextBreakAt = now + interval
   │                            │ tray:resume  ───► reset to running, nextBreakAt = now + interval
   │
   │ tray:break-now ────────────► fire break-due immediately (no state change; counter advances on overlay-dismissed)
   │ tray:skip-next ────────────► nextBreakAt = now + interval, longBreakCounter += 1
   │
   │ (M5) suppression-on ───► [suppressed]
   │ (M8) office-hours-off ─► [outside-office-hours]
```

## Events

| Event | Payload | When |
|------|---------|------|
| `state-changed` | full `SchedulerState` snapshot | every transition or field change |
| `pre-warning-due` | `{ isLongBreak: boolean }` | 60s before `nextBreakAt` while `running` |
| `break-due` | `{ isLongBreak: boolean, durationMs: number }` | at `nextBreakAt` while `running`, or on `tray:break-now` |
| `pause-expired` | `{ pausedAt: number, pausedUntil: number }` | auto-expiry; also fires immediately after `tray:resume` |

## Persistence

`electron-store` key `scheduler`:

```ts
{
  lastBreakAt: number | null,
  longBreakCounter: number,
  pausedUntil: number | null  // restored only if still in the future
}
```

Restore on launch:
1. If `pausedUntil > now`: enter `paused`, keep `pausedUntil` as-is.
2. Else if `lastBreakAt + intervalMs > now`: schedule `nextBreakAt = lastBreakAt + intervalMs`.
3. Else: schedule `nextBreakAt = now + intervalMs` (don't fire instantly).

## Pause durations

| Action | Duration |
|------|---------|
| `pause:15m` | 15 min |
| `pause:30m` | 30 min |
| `pause:1h` | 60 min |
| `pause:until-tomorrow` | midnight local + 1 minute (so first break after tomorrow's wake) |

## Long-break rule

Counter increments on every break that *consumes* a slot — completed *or* skipped. Snooze does not increment (M4). When the upcoming slot is the Nth (`counter % cadence === cadence - 1` when zero-indexed, or simpler: `(counter + 1) % cadence === 0`), set `isNextLong = true` and emit it on every `state-changed`.

## Snooze + long-break collision (M4)

If a snoozed short break would land inside a long-break window, the long break wins. Snooze defers by 5 min; if the deferred slot lands on a long slot, replace not stack — counter goes long, the snoozed short is dropped.

## M2 scope

Implement: `running`, `paused`, all transitions on this row, long-break detection, persistence, restore, settings-reactive recompute, tray-driven actions, `state-changed` broadcast, `break-due` + `pre-warning-due` emission (consumed by dev panel only — overlay is M3).

Defer: `suppressed`, `outside-office-hours`, snooze, blink — those are M4/M5/M6/M8.
