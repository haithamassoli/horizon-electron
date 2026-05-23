# Horizon — Milestones & Tasks

Sequenced delivery plan for v1 (Windows). Each milestone is a working, demoable increment — not a paper deliverable.

Sizing: **S** ≈ a few days, **M** ≈ ~1 week, **L** ≈ ~2 weeks (solo, focused).

---

## M1 — Foundation

**Outcome:** Electron shell launches; React + TypeScript + Tailwind + Shadcn renderer mounts; secure IPC bridge (`contextIsolation`, `sandbox`, typed `preload.ts`, Zod validation) round-trips a payload end-to-end; `electron-store` persists and reads a schema-validated settings object.
**Size:** M
**Depends on:** —

**Tasks:**

1. [x] Initialize repo with `electron-vite` (React + TypeScript template). Three entry points: `main`, `preload`, `renderer`.
2. [x] Configure `tsconfig` with `strict: true` across all three processes; set up path aliases (`@main`, `@renderer`, `@shared`).
3. [x] Install and configure Tailwind CSS; define a custom theme token for the soft light-blue accent (`primary`).
4. [x] Initialize Shadcn UI; install base primitives needed across the app (Button, Switch, Select, Slider, Card, Toast).
5. [x] Configure ESLint (typescript-eslint, react-hooks) and Prettier; add lint + format scripts.
6. [x] Install Framer Motion; render a one-off animated component to verify the renderer pipeline works.
7. [x] Create `@shared/schemas` module — Zod schemas for the full settings object and every IPC channel payload.
8. [x] Configure `electron-store` with the Zod-derived TypeScript type as its schema; expose a typed `settingsStore` singleton from main.
9. [x] Implement `preload.ts` using `contextBridge.exposeInMainWorld('horizon', api)`. Define a typed API surface (no Node leakage). Set `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`.
10. [x] Build a generic IPC handler registry in main: every channel goes through Zod validation; invalid payloads reject with a typed error.
11. [x] Implement `settings:get`, `settings:set`, `settings:subscribe` channels end-to-end.
12. [x] Build a temporary dev panel in the settings window that round-trips a setting value (write → store → IPC subscribe → renderer re-render). This is the M1 acceptance check.
13. [x] Configure the main settings window: standard frame, `width: 720`, `height: 720`, closable hides instead of quits.

---

## M2 — Scheduler Engine & Tray

**Outcome:** Timer engine in the main process drives the break schedule (events emit to a dev panel — overlay not built yet). System tray icon is persistent with the full right-click menu and a left-click status popover showing the live countdown.
**Size:** M
**Depends on:** M1

**Tasks:**

1. [ ] Sketch the scheduler state machine in a `SCHEDULER.md` (states: `running`, `paused`, `suppressed`, `idle-reset`; transitions; events).
2. [ ] Implement a `Scheduler` class in main: holds `nextBreakAt`, `longBreakCounter`, current state. Emits typed events (`break-due`, `pre-warning-due`, `pause-expired`, `state-changed`).
3. [ ] Persist scheduler state (`lastBreakAt`, `longBreakCounter`) to `electron-store` on every change.
4. [ ] Restore scheduler state on app launch; if `lastBreakAt` is older than the configured break interval, schedule the next break for `now + interval` (don't fire instantly).
5. [ ] Implement long-break detection: every Nth break (configurable, default 4) sets `isLongBreak: true` on the emitted event.
6. [ ] Wire scheduler to settings via `settings:subscribe` — reconfiguring break interval recomputes `nextBreakAt`.
7. [ ] Design + commission tray icon assets: Active and Paused variants, light + dark backgrounds (4 PNGs).
8. [ ] Create `Tray` module in main: load icon, swap variant on state change.
9. [ ] Build right-click `Menu` per spec (Pause 15m / 30m / 1h / Until tomorrow / sep / Take break now / Skip next / sep / Open Settings / Quit).
10. [ ] Implement pause logic with auto-expiry — at expiry, reset scheduler so the user does not get an instant break.
11. [ ] Implement "Take a break now" — fires `break-due` immediately, bypassing the schedule.
12. [ ] Implement "Skip next break" — advances the schedule by one interval, increments long-break counter, no overlay.
13. [ ] Build the left-click popover as a small frameless `BrowserWindow`, sized to content, positioned relative to `tray.getBounds()`.
14. [ ] Implement `state:get` and a `state:subscribe` IPC channel; popover renderer subscribes for live countdown.
15. [ ] Popover auto-closes on `blur` event and on an 8s timeout.
16. [ ] Show three popover states: `Next break in mm:ss`, `Paused until h:mm a`, `Outside office hours` (the third is wired to the office-hours module from M8 — placeholder string for now).
17. [ ] Add a dev-only panel inside the settings window that logs scheduler events live. This is the M2 acceptance check.

---

## M3 — Break Overlay (Casual Baseline)

**Outcome:** Scheduled breaks fire a frameless full-screen overlay across all displays — primary shows countdown + breathing gradient, secondaries show the dimmed/blurred lockout. The 60s pre-break warning toast precedes every break. Skip button dismisses (Casual behavior only). Long-break cadence works.
**Size:** L
**Depends on:** M2

**Tasks:**

1. [ ] Implement an `OverlayManager` in main: spawns / dismisses overlay windows across displays atomically.
2. [ ] Window config: `frame: false`, `fullscreen: true`, `alwaysOnTop: 'screen-saver'`, `skipTaskbar: true`, `focusable: true`, `closable: false`.
3. [ ] On `break-due`, enumerate `screen.getAllDisplays()`, identify primary via `screen.getPrimaryDisplay()`, spawn one overlay per display with a `role` query param (`primary` or `secondary`).
4. [ ] Build the primary overlay renderer view: soft animated breathing gradient background (light-blue dominant).
5. [ ] Add the centered countdown timer (Tailwind `font-light`, large size). Wire to a `tick` IPC event from main (1 Hz).
6. [ ] Add a placeholder breathing visual (expanding/contracting circle — actual breathing pattern logic comes in M7).
7. [ ] Build the secondary overlay renderer view: 90% black background, blur applied to a snapshot or pure backdrop, no UI.
8. [ ] Implement the skip button (Casual mode only at this stage). On click, sends `overlay:skip` IPC; main dismisses all overlays.
9. [ ] Implement keyboard skip (Space / Enter / Esc) in Casual mode — same effect as button.
10. [ ] Implement the pre-break warning toast: 60s before `break-due`, main emits `pre-warning-due`. Spawn a small frameless `BrowserWindow` positioned bottom-right of the primary display.
11. [ ] Style the toast: minimal, "Break in 60s", subtle close button. Slide-in from bottom-right (Framer Motion, 300ms spring).
12. [ ] Toast acknowledge-only — closing the toast does not skip the break.
13. [ ] Differentiate long break from short break in overlay (longer duration, identical visual; optional subtle copy "Long break").
14. [ ] Add overlay fade-in (400ms ease-out) and fade-out (250ms ease-in) using Framer Motion.
15. [ ] Add settings UI controls for break timing (interval, short duration, long cadence, long duration) with the spec'd ranges; wire to live `settings:set`.
16. [ ] Acceptance check: with a 1-min interval and 10s short break, run for 5 minutes uninterrupted across two displays — verify toast → overlay → dismissal flow works on every cycle.

---

## M4 — Enforcement Modes & Snooze

**Outcome:** Balanced mode's 7s forced lockout works. Hardcore mode hides skip/snooze, disables shortcuts, ships the panic-exit failsafe. Snooze logic with per-session and per-day caps is live; snooze hidden entirely in Hardcore.
**Size:** M
**Depends on:** M3

**Tasks:**

1. [ ] Add `enforcementMode: 'casual' | 'balanced' | 'hardcore'` to settings schema; default `balanced`.
2. [ ] Pass current mode to overlay renderers via a query param + initial state IPC.
3. [ ] Build the `ModeCard` Shadcn component (gradient header, name, one-line description, selected state with soft glow).
4. [ ] Render the three mode cards in the settings page (Mode section); selection updates `settings:set` immediately.
5. [ ] Implement Balanced behavior in overlay: skip button rendered but disabled, count down 7s, then enable with a soft color transition (200ms).
6. [ ] Implement Balanced keyboard behavior: Space / Enter / Esc no-op for first 7s, then active.
7. [ ] Implement Hardcore behavior: skip + snooze buttons not rendered; set `kiosk: true` on overlay windows.
8. [ ] Disable all standard keyboard dismissal paths in Hardcore.
9. [ ] Implement the Hardcore panic exit: global keyboard listener inside overlay detects `Ctrl+Shift+Esc` held for 5 continuous seconds (release resets the counter). On trigger, dismiss all overlays.
10. [ ] Add a small footnote on the Hardcore mode card: "Emergency exit: hold Ctrl+Shift+Esc for 5 seconds." Not prominent.
11. [ ] Add the snooze button to the overlay (Casual + Balanced only). In Balanced, the 7s lockout applies to snooze as well as skip.
12. [ ] Implement snooze in scheduler: defers current break by 5 min; long-break counter unchanged.
13. [ ] Track `snoozesUsedThisSession` in main; reset on every idle-reset event.
14. [ ] Track `snoozesUsedToday` in `electron-store`; reset at local midnight via a daily timer.
15. [ ] Add per-session snooze cap setting (dropdown: 1, 2, 3, 5, unlimited; default unlimited).
16. [ ] Add per-day snooze cap setting (dropdown: 1, 3, 5, 10, unlimited; default unlimited).
17. [ ] When a cap is reached, render snooze button disabled with a small tooltip ("Daily snooze limit reached").
18. [ ] Handle the snooze + long-break collision: if a snoozed short break would fire during a long break window, long break wins, no stack.
19. [ ] Reactively hide the entire Snooze section in settings UI when mode is Hardcore.

---

## M5 — Activity Awareness

**Outcome:** Idle ≥5min pauses + resets timers. Fullscreen and meeting (mic/cam) detection suppress breaks with a 30s post-suppression buffer. Deferred-break queue collapses multiple triggers. Warning cancels and re-queues correctly when suppression resumes mid-warning.
**Size:** L
**Depends on:** M2, M3

**Tasks:**

1. [ ] Implement `IdleMonitor` in main using `powerMonitor.getSystemIdleState(threshold)` polled every 30s.
2. [ ] On crossing the 5-min idle threshold, emit `idle-detected`; scheduler pauses + clears `nextBreakAt`.
3. [ ] On next activity (idle state returns to `active`), emit `activity-resumed`; scheduler resets `nextBreakAt` to `now + interval`.
4. [ ] Cancel an in-flight pre-break warning if idle is detected mid-countdown.
5. [ ] Reset `snoozesUsedThisSession` on every `activity-resumed`.
6. [ ] Install `active-win` package. Build `FullscreenMonitor` in main, polled at 5s normally and 1s during the 60s pre-break warning window.
7. [ ] Detect OS-level fullscreen state on any display. Emit `fullscreen-active` / `fullscreen-ended`.
8. [ ] Implement `MeetingMonitor` for Windows: detect active microphone session via MMDevice / WASAPI session enumeration; detect active camera via MediaCapture or equivalent.
9. [ ] Fail-open: if a monitor cannot initialize on the current platform, log a warning, continue without that layer.
10. [ ] Build a `SuppressionGate` module that ORs `fullscreen-active` and `meeting-active` into a single `suppressed` state for the scheduler to consume.
11. [ ] When `suppressed` becomes true and a break is due, set `deferredBreak: true` (single slot). Additional triggers while suppressed collapse — only one deferred break ever queued.
12. [ ] On `suppressed` becoming false, start a 30s buffer timer. After the buffer, if `deferredBreak`, fire the standard 60s pre-break warning then the overlay.
13. [ ] If `suppressed` becomes true again during the 60s warning or the 30s buffer, cancel and re-queue.
14. [ ] Wire blink reminder to the same `suppressed` state — if suppressed, blink fires are silent skips (no queue, no defer).
15. [ ] Add a "Deferred — meeting active" string to the tray popover state when applicable.
16. [ ] Acceptance check: with a 2-min interval, start a Zoom call, verify no overlay fires; end the call, verify the deferred break fires 30s + 60s later.

---

## M6 — Blink Reminder

**Outcome:** Transparent click-through pulse window spawns per display with the 1.2s soft pulse. Interval configurable 5–30 min. Inherits suppression rules — silently skipped, never queued.
**Size:** S
**Depends on:** M5

**Tasks:**

1. [ ] Add blink reminder settings to schema (`enabled: bool`, default true; `intervalMinutes: number`, default 5, range 5–30).
2. [ ] Implement `BlinkScheduler` in main — independent timer from the break scheduler.
3. [ ] Subscribe `BlinkScheduler` to the `SuppressionGate`; when suppressed, silently skip the tick (no queue).
4. [ ] Implement the pulse overlay window factory: `frame: false`, `transparent: true`, `alwaysOnTop: true`, `skipTaskbar: true`, `focusable: false`, `setIgnoreMouseEvents(true, { forward: true })`.
5. [ ] Size the pulse window to full display bounds per `screen.getAllDisplays()`; spawn one per display per tick.
6. [ ] Build the pulse renderer: thin gradient ring at the screen edges, Framer Motion opacity animation `0 → 0.35 → 0` over 1.2s ease-in-out.
7. [ ] Auto-destroy the window after the animation completes (1.3s timeout for safety).
8. [ ] Add a toggle for blink reminder to settings (default on).
9. [ ] Add an interval slider (5–30 min, step 1) to settings.
10. [ ] Pause blink reminders during manual pause and outside office hours (same gates as breaks).

---

## M7 — Sensory & Onboarding Polish

**Outcome:** Single-screen onboarding. Today panel in settings. Breathing circle / 20-20-20 / none visual aids. Ambient audio (Rain, Fire, Lightning) with fades. Light-blue accent everywhere; Framer Motion transitions polished.
**Size:** L
**Depends on:** M3, M4

**Tasks:**

1. [ ] Add `firstLaunchComplete: bool` to settings schema, default false.
2. [ ] On app launch, if `firstLaunchComplete === false`, open the onboarding window instead of the main settings window.
3. [ ] Build the onboarding view: welcome line ("Horizon. A quiet coach for your eyes."), three mode cards in a row, "Start" button.
4. [ ] Onboarding default selection is Balanced.
5. [ ] "Start" button writes the selected mode, sets `firstLaunchComplete: true`, closes onboarding, opens settings window, starts scheduler.
6. [ ] Add `Today` counters to `electron-store`: `breaksTaken`, `breaksSkipped`, `snoozesUsed`, `blinksShown`. Each `{ date: 'YYYY-MM-DD', count: number }`.
7. [ ] Increment counters from the scheduler / overlay / blink scheduler at the appropriate event boundaries.
8. [ ] Build a midnight-reset job: on app open + every minute, check if local date has advanced; if so, zero the counters with the new date.
9. [ ] Build the Today panel component at the top of settings: four-cell grid with plain typography, no progress bars.
10. [ ] Hide the `Snoozes used today` cell when mode is Hardcore.
11. [ ] Build the breathing circle visual: Framer Motion animation looping 4-7-8 (scale `1 → 1.4 → 1.4 → 1`, with `inhale 4s / hold 7s / exhale 8s`). Optional subtle text cue ("Inhale", "Hold", "Exhale") synced to phases.
12. [ ] Build the 20-20-20 visual: centered "Look at something 20 feet away for 20 seconds." Calm typography. No animation.
13. [ ] Build the `None` visual (just the gradient background, no center element).
14. [ ] Add a visual-aid dropdown to settings (`Breathing` / `20-20-20` / `None`, default `Breathing`).
15. [ ] Source three royalty-free, seamlessly looped, ≥3 min ambient tracks (Rain, Fire, Lightning). Master each to -18 LUFS.
16. [ ] Bundle audio files via `electron-builder` `extraResources`; resolve paths via `app.getAppPath()` / `process.resourcesPath` at runtime.
17. [ ] Implement audio playback in the primary overlay renderer using HTML `<audio>` with `loop` attribute.
18. [ ] Implement 1s fade-in at break start and 1s fade-out at break end via Web Audio `GainNode` or programmatic volume ramping.
19. [ ] Add the ambient audio dropdown to settings (`Off` / `Rain` / `Fire` / `Lightning`, default `Off`).
20. [ ] Sweep the codebase to replace placeholder colors with the light-blue accent token; verify dark mode contrast.
21. [ ] Polish all Framer Motion transitions: mode-card hover (scale 1 → 1.02 + soft glow), toast spring, overlay fades, popover fade-in.

---

## M8 — Operating Window & System Integration

**Outcome:** Office hours setting silently suppresses outside the window. Auto-launch toggle wired to OS. Theme switching. Version footer opens downloads page.
**Size:** S
**Depends on:** M2

**Tasks:**

1. [ ] Add office hours to settings schema: `enabled: bool`, `startTime: 'HH:mm'`, `endTime: 'HH:mm'`, `activeDays: number[]` (0–6, default `[1,2,3,4,5]`).
2. [ ] Build the office hours UI section: a toggle, two time pickers, a row of weekday checkboxes.
3. [ ] Implement `OfficeHoursGate` in main: every minute, compute whether the current time falls inside the active window.
4. [ ] Wire the gate into both the break scheduler and the blink scheduler — when outside, timers do not advance and no events fire.
5. [ ] Update the tray popover state to show `Outside office hours` when applicable.
6. [ ] Wire auto-launch toggle to `app.setLoginItemSettings({ openAtLogin, openAsHidden: true })`. Apply live on change.
7. [ ] Add the auto-launch toggle to settings General section (default on).
8. [ ] Add Tailwind dark mode (`class` strategy). Implement a theme provider in the renderer.
9. [ ] Read the OS theme on startup via `nativeTheme.shouldUseDarkColors`; subscribe to `nativeTheme.on('updated')`. When theme setting is `System`, follow it; when `Light` or `Dark`, override.
10. [ ] Add theme dropdown to settings General (default `System`).
11. [ ] Add version footer to settings — read `app.getVersion()` exposed via IPC. Render as a small clickable line.
12. [ ] On version-footer click, `shell.openExternal()` opens the public downloads URL (define a constant; placeholder URL until M10 ships the page).

---

## M9 — Hardening & QA

**Outcome:** Edge cases verified. Playwright smoke tests cover overlay spawn/dismiss and tray menu. Manual QA on real hardware. No functional regressions.
**Size:** M
**Depends on:** M1–M8

**Tasks:**

1. [ ] Verify `screen.on('display-added')` mid-break: new display gets the dimmed lockout, existing overlays unaffected.
2. [ ] Verify `screen.on('display-removed')` mid-break: destroyed display's overlay is cleaned up; if it was the primary, promote the next display to primary with full UI.
3. [ ] Test snooze + long-break collision: snoozed short break that lands during the long-break window is replaced, not stacked.
4. [ ] Test pause expiry: at every pause duration (15m, 30m, 1h, until tomorrow), confirm timer resets and no instant break fires.
5. [ ] Test restart persistence: `lastBreakAt` and `longBreakCounter` survive a quit + relaunch; today counters preserve same-day, reset across midnight.
6. [ ] Test simultaneous-trigger race: schedule a break exactly at the moment idle ends; confirm exactly one overlay spawns.
7. [ ] Test Balanced timing: keyboard skip is reliably no-op at t=6.9s and active at t=7.0s; measure with manual stopwatch + automated.
8. [ ] Set up Playwright for Electron test harness.
9. [ ] Write smoke test: open settings → change break interval → confirm scheduler updates.
10. [ ] Write smoke test: trigger "Take break now" from tray → overlay spawns on all displays → dismiss → all overlays destroyed.
11. [ ] Write smoke test: pause for 15m → confirm tray icon state changes → confirm no break for 15 min (use accelerated clock if feasible).
12. [ ] Author a manual QA checklist (`QA.md`) covering: every enforcement mode, every pause duration, every visual aid, each ambient audio track, multi-monitor, hot-plug, idle/fullscreen/meeting suppression, panic exit, midnight reset.
13. [ ] Run the full manual QA pass on a real Windows machine with at least two displays.
14. [ ] Triage all findings: ship-block only on functional regressions; defer cosmetic issues to v1.1.

---

## M10 — Packaging & Release

**Outcome:** `electron-builder` produces a working NSIS installer. Auto-launch verified on real reboot. Downloads page live. Horizon v1.0.0 tagged and released.
**Size:** S
**Depends on:** M9

**Tasks:**

1. [ ] Configure `electron-builder` for Windows NSIS target in `electron-builder.yml`. Set `productName`, `appId`, install path, icons (256, 128, 64, 32, 16).
2. [ ] Bundle all extra resources (audio files, tray icon variants).
3. [ ] Build the unsigned installer locally; verify install → first launch → uninstall flow.
4. [ ] (Optional) If a code signing certificate is available, configure signing; otherwise document the "unknown publisher" warning in the README.
5. [ ] Install the built artifact on a clean Windows machine; reboot; verify auto-launch into tray works.
6. [ ] Author a minimal downloads page (static HTML, single download button, version + changelog). Host via GitHub Releases or GitHub Pages.
7. [ ] Replace the placeholder downloads URL constant from M8 with the live URL.
8. [ ] Write `CHANGELOG.md` v1.0.0 entry summarizing features and known limitations (Windows-only, manual updates, English only).
9. [ ] Tag `v1.0.0` in git; create the GitHub Release with the installer attached.
10. [ ] Publish the downloads page; smoke-test the download → install flow end-to-end one final time.

---

## Critical Path

`M1 → M2 → M3 → M4 → M5 → M6 → M7 → M9 → M10`

**M8** can slot in anywhere after M2 — it touches independent settings surfaces and does not block other work. Ideal filler for context-switch days or when blocked on a harder milestone.
