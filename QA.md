# Horizon QA Checklist

Run on Windows with at least two displays. Record pass/fail, build SHA, OS version, display layout, and notes.

## Enforcement Modes

- Casual: skip button visible; Space, Enter, Esc skip immediately.
- Balanced: skip and snooze disabled until 7.0s; keyboard no-op at 6.9s, active at 7.0s.
- Hardcore: skip and snooze hidden; standard dismissal paths fail; holding Ctrl+Shift+Esc for 5s exits.

## Pauses

- Pause 15m: tray icon changes to paused; no instant break on expiry.
- Pause 30m: tray icon changes to paused; no instant break on expiry.
- Pause 1h: tray icon changes to paused; no instant break on expiry.
- Pause until tomorrow: resumes after local midnight window; no instant break on expiry.

## Break Flow

- Pre-warning appears 60s before break and close does not skip break.
- Overlay spawns on every display.
- Primary display shows countdown and selected visual aid.
- Secondary displays show dim lockout only.
- Natural completion increments `breaksTaken`.
- Skip increments `breaksSkipped`.
- Snooze defers by 5m and obeys session/day caps.
- Snoozed short break colliding with long-break slot is replaced, not stacked.

## Visual And Audio

- Breathing visual uses 4-7-8 loop and phase text.
- 20-20-20 visual shows static instruction.
- None visual shows only gradient background.
- Rain track loops and fades in/out.
- Fire track loops and fades in/out.
- Lightning track loops and fades in/out.
- Missing audio file fails quietly with no overlay crash.

## Multi-Monitor And Hot-Plug

- Add display mid-break: new display gets dim lockout; existing overlays stay open.
- Remove secondary mid-break: its overlay is cleaned up; remaining overlays stay open.
- Remove primary mid-break: next display is promoted to full UI.

## Activity And Suppression

- Idle for 5m pauses/reset timers; activity resumes schedule from now.
- Fullscreen suppresses break and blink reminders.
- Meeting mic/cam suppresses break and blink reminders.
- Suppression ending queues deferred break after 30s buffer plus 60s warning.
- Suppression resuming during buffer or warning cancels and re-queues.

## Counters And Persistence

- `lastBreakAt` and `longBreakCounter` survive quit and relaunch.
- Today counters preserve same-day values.
- Today counters reset after local midnight.
- Snooze daily cap resets after local midnight.

## Packaging

- Unsigned NSIS installer starts without install errors.
- First launch after install opens onboarding or tray as expected.
- Auto-launch works after real reboot.
- Uninstall removes application shortcuts and app files.
- Download page button downloads installer and install flow completes.
