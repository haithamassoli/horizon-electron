# Horizon — PRD

## Summary

Horizon is a minimalist desktop coach for eye strain. It runs silently in the Windows system tray, infers when the user is actually working, and intervenes at the right moment with a soft blink reminder, a calming full-screen break overlay, and three escalating enforcement modes. Built for developers, designers, and knowledge workers who already feel the strain and want a coach they trust — not a nag they uninstall in two days. Local-first, no telemetry, free.

---

## 1. Target User & Principles

**Primary user:** Developers, designers, knowledge workers, 6+ hours/day on screen, already experiencing dryness, headaches, or blur. Existing pain, latent solution-seeking.

**Voice:** Empathetic, encouraging, never scolding. Hardcore mode frames itself as "commitment to yourself," not punishment.

**Principles:**
- **Trust over enforcement.** A break that fires while the user is away erodes trust permanently. Activity awareness is non-negotiable.
- **Calm by default.** Silent audio, soft motion, no characters, no streaks-as-pressure.
- **Minimal surface area.** One settings window, one tray menu, one overlay. No tabs, no wizards beyond a single onboarding screen.
- **Local-first.** All data on disk. No telemetry, no account, no network calls in v1.
- **Defaults match the 20-20-20 rule** out of the box; everything tunable.

---

## 2. Core Features

### 2.1 Blink Reminder
Soft 1–2s glow that pulses along screen edges and fades. Silent. Interval configurable 5–30 min (default 5). Implemented as a transparent, click-through, always-on-top window — not an OS notification (OS toasts get batched, silenced by Focus modes, and lost).

Honors the same activity-awareness rules as breaks (idle, fullscreen, meeting). If suppressed, skipped silently — does not queue.

### 2.2 Short Break (Screen Break)
Frameless full-screen overlay that locks input. Default cadence: every 20 min, 30s duration. Both configurable. Triggered by main scheduler, gated by activity awareness, preceded by a 60s pre-break warning toast.

### 2.3 Long Break
Every Nth break (default 4) is a long break (default 3 min). Same overlay UX as short break, longer duration. Same enforcement mode applies.

### 2.4 Pre-Break Warning
60s before any break locks the screen, a minimal toast appears bottom-right: "Break in 60s." Dismissible (acknowledges only, does not skip). Non-blocking. Critical for trust — surprise lockouts ruin the contract.

---

## 3. Enforcement Modes

Three modes, selectable in onboarding and settings. Apply to both short and long breaks.

### 3.1 Casual
- Skip button visible and enabled immediately.
- Keyboard shortcut (Space / Enter / Esc) active immediately.
- Snooze enabled.
- Use case: trial users, light strain, "I want a coach but I'm the boss."

### 3.2 Balanced (default)
- Skip button visible but **disabled** for 7s.
- Keyboard shortcuts disabled for the same 7s.
- At t=7s, button and shortcuts enable simultaneously with a soft color transition signaling availability.
- Snooze enabled (and also gated by the 7s lockout).
- Use case: most users. Friction makes skipping intentional, not reflexive.

### 3.3 Hardcore
- No skip button. No snooze. Hidden, not greyed.
- All keyboard shortcuts disabled for the full break duration.
- **Panic exit (failsafe):** Hold `Ctrl+Shift+Esc` for 5 continuous seconds. Documented only in a footnote on the Hardcore mode card. Not advertised. Emergency use.
- Framing copy: "You're committing to this break. Trust the process."

---

## 4. Snooze

- **Duration:** Fixed at 5 min per snooze. Not user-configurable.
- **Per-session cap:** Default unlimited. User can restrict via dropdown (1, 2, 3, 5, unlimited). Session = period of active use between idle resets.
- **Per-day cap:** Default unlimited. Dropdown (1, 3, 5, 10, unlimited). Resets at local midnight.
- **Mode availability:** Casual and Balanced only. Hidden in Hardcore.
- **Behavior:** Snooze defers the *current* break by 5 min. Does not advance the long-break counter. A snoozed short break that would collide with a long break is replaced by the long break — they do not stack.

---

## 5. Activity Awareness

The single most important system in Horizon. Runs continuously in the main process. Three layers, all fail-open (if a signal is unavailable, that layer is absent — the app does not block on missing OS APIs).

### 5.1 Idle Detection
- `powerMonitor.getSystemIdleState` polled every 30s.
- If idle ≥ 5 min, active timer pauses **and resets** on next user activity. User does not return from coffee to an instant break.
- Pre-break warning that was mid-countdown when idle began is cancelled, not resumed.

### 5.2 Fullscreen Suppression
- Detect any window in OS-level fullscreen state on any display.
- If detected, defer the break: no overlay, no pre-break warning.
- When fullscreen ends, wait 30s (avoid interrupting the moment a presentation closes), then fire the deferred break.
- Maximum one deferred break; additional triggers during the same suppression window collapse into one.

### 5.3 Meeting Suppression
- Detect active microphone or camera use via OS APIs (Windows: MMDevice / WASAPI for mic, MediaCapture for camera).
- If detected, defer identically to fullscreen suppression. Same 30s post-meeting buffer.
- Where the platform signal is unavailable, this layer is silently absent — fullscreen suppression alone covers the case.

### 5.4 Deferred-Break Behavior
- Deferred breaks are silent — no pre-break warning while suppression is active.
- After suppression lifts + 30s buffer, the standard 60s pre-break warning runs, then the overlay fires.
- If suppression resumes during the 60s warning, the warning is cancelled and the break re-queues.

---

## 6. Operating Window

- **Office Hours setting** — disabled by default. App tracks active time whenever the computer is on.
- When enabled, user defines weekday windows (e.g., 9:00–18:00). Outside the window: blink reminders and breaks silently suppressed; timers do not advance.
- Single time window for all active days in v1 (no per-day schedules). User selects which weekdays are "active days" via checkboxes (default Mon–Fri).

---

## 7. Break Overlay UX

### 7.1 Visual Composition
- **Background:** soft, slowly animated breathing gradient. Light-blue accent dominates. No characters, no clipart, no quotes.
- **Center:** large countdown timer (mm:ss). Tailwind/Shadcn typography, weight 300.
- **Below timer:** one calming visual element. Default: expanding/contracting circle synced to 4-7-8 breathing (inhale 4s, hold 7s, exhale 8s). Toggleable in settings between (a) breathing circle, (b) 20-20-20 text prompt ("Look at something 20 feet away for 20 seconds"), or (c) none.
- **Bottom-right:** skip / snooze affordances per enforcement mode. In Hardcore: nothing.

### 7.2 Audio (Optional)
- Silent by default.
- User can enable ambient audio during breaks. Three high-fidelity tracks ship with the app: **Rain**, **Fire**, **Lightning** (rain + occasional thunder).
- Single dropdown in settings: Off / Rain / Fire / Lightning. No volume slider in v1 — tracks pre-mastered at -18 LUFS.
- Fade in 1s at break start, fade out 1s at break end.

### 7.3 Multi-Monitor
- **Primary display:** full UI (gradient, timer, breathing visual, audio).
- **Secondary displays:** deeply dimmed (90% black) blurred lockout window. Input captured. No UI rendered. Same `alwaysOnTop`, `skipTaskbar`, frameless.
- One overlay window per display, spawned simultaneously, dismissed simultaneously.
- `screen.getAllDisplays()` at break trigger. Subscribe to `display-added` / `display-removed` to handle hot-plugged monitors mid-break (new monitor gets dimmed lockout).

### 7.4 Animations (Framer Motion)
- Overlay fade-in: 400ms ease-out.
- Overlay fade-out: 250ms ease-in.
- Pre-break warning toast: slide-in from bottom-right, 300ms spring.
- Blink reminder pulse: 1.2s ease-in-out, opacity 0 → 0.35 → 0.
- Mode-card hover (onboarding/settings): soft glow + scale 1 → 1.02 → 1.

---

## 8. Tray & Manual Controls

### 8.1 Tray Icon
- Persistent in system tray while app is running.
- Two visual states: **Active** (timers running), **Paused** (manually paused or outside office hours). Subtle dot indicator overlay distinguishes them.

### 8.2 Left-Click — Status Popover
Small popover, not the main window. Shows:
- Current state: `Next break in 14:32` / `Paused until 6:00 PM` / `Outside office hours`.
- One-line summary of today: `4 breaks taken today`.
- Closes on outside click or 8s timeout.

### 8.3 Right-Click — Menu
- Pause for 15 minutes
- Pause for 30 minutes
- Pause for 1 hour
- Pause until tomorrow
- ---
- Take a break now
- Skip next break
- ---
- Open Settings
- Quit Horizon

### 8.4 Pause Semantics
- All pause options suppress blink reminders and breaks until expiry.
- Timers reset at expiry — user does not get an immediate break the moment a pause ends.
- "Pause until tomorrow" expires at local midnight.

---

## 9. Today Panel

Embedded at the top of the main settings window. Resets at local midnight. No history, no streaks, no charts.

Displays:
- Breaks taken today (count)
- Breaks skipped today (count)
- Snoozes used today (count) — hidden in Hardcore
- Blink reminders shown today (count)

Read-only. No interactions. Plain typography. No progress bars or gamification.

---

## 10. Onboarding

Single screen. First launch only. Three sections, top to bottom:

1. **Welcome line:** "Horizon. A quiet coach for your eyes." One line. No subtitle.
2. **Mode selection:** Three cards (Casual, Balanced, Hardcore). Each card: name, one-line description, soft gradient header. Balanced pre-selected. Changeable in settings.
3. **CTA:** "Start" button. Drops user into main settings window with mode applied, defaults configured, tray icon active, timer running.

No tutorials, no permission walkthroughs, no email capture.

---

## 11. Settings IA

Single window, single scrollable column. No tabs. Sections (top to bottom):

1. **Today panel** (read-only, §9)
2. **Breaks**
   - Break interval (5–60 min, default 20)
   - Short break duration (15s–2min, default 30s)
   - Long break — every Nth break (2–10, default 4)
   - Long break duration (1–10min, default 3min)
3. **Enforcement mode** — three cards (Casual / Balanced / Hardcore), gradient headers
4. **Snooze**
   - Per-session limit (dropdown, default unlimited)
   - Per-day limit (dropdown, default unlimited)
5. **Blink reminder**
   - Toggle on/off (default on)
   - Interval (5–30 min, default 5)
6. **Break overlay**
   - Visual aid: Breathing circle / 20-20-20 text / None (default Breathing)
   - Ambient audio: Off / Rain / Fire / Lightning (default Off)
7. **Office hours**
   - Toggle on/off (default off)
   - Start time, end time
   - Active days (checkboxes Mon–Sun, defaults Mon–Fri)
8. **General**
   - Auto-launch at startup (default on)
   - Theme (System / Light / Dark, default System)
   - Version (clickable — opens project downloads page for manual update)

All settings persist via `electron-store` and apply live. No Save button. Hardcore-mode-specific sections (snooze) hide reactively when the mode is selected.

---

## 12. Defaults Summary

| Setting | Default |
|---|---|
| Break interval | 20 min |
| Short break duration | 30 s |
| Long break cadence | Every 4th |
| Long break duration | 3 min |
| Enforcement mode | Balanced |
| Balanced lockout duration | 7 s |
| Hardcore panic exit | Hold Ctrl+Shift+Esc 5 s |
| Snooze duration | 5 min (fixed) |
| Snooze per-session cap | Unlimited |
| Snooze per-day cap | Unlimited |
| Blink reminder | On, every 5 min |
| Pre-break warning | 60 s |
| Idle threshold | 5 min |
| Post-suppression buffer | 30 s |
| Office hours | Disabled |
| Ambient audio | Off |
| Visual aid | Breathing circle |
| Theme | System |
| Accent color | Soft light blue |
| Auto-launch | On |

---

## 13. Tech Architecture

### 13.1 Stack
- **Renderer:** React 18+, TypeScript, Tailwind CSS, Shadcn UI, Framer Motion.
- **Main:** Electron (latest stable), Node.js. TypeScript end-to-end.
- **Storage:** `electron-store` (JSON-on-disk), Zod-validated schema.
- **Build:** Vite (renderer), `electron-builder` (packaging).
- **Tests:** Vitest for renderer logic; Playwright for Electron for overlay + tray smoke tests.

### 13.2 Process Topology
- **Main process owns:** timers, idle/fullscreen/meeting detection, tray icon, IPC, all break/overlay window lifecycles, `electron-store`, schedule state.
- **Renderer — Settings:** main window UI. Pure presentation. Reads/writes via IPC.
- **Renderer — Overlay:** one renderer instance per display, spawned by main on break trigger, killed on break end.
- **Renderer — Popover:** small renderer for tray left-click, instantiated on demand.
- **Renderer — Blink Pulse:** transparent click-through overlay, spawned per display on blink reminder fire.

### 13.3 IPC Bridge
- Strict `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- All IPC exposed via typed `preload.ts` using `contextBridge.exposeInMainWorld('horizon', {...})`.
- Channels (illustrative):
  - `settings:get`, `settings:set`, `settings:subscribe`
  - `state:get` (current timer / pause / idle / suppression state)
  - `tray:pause`, `tray:resume`, `tray:break-now`, `tray:skip-next`
  - `overlay:skip`, `overlay:snooze` (overlay renderer → main)
  - `today:get` (read-only counters)
- All channel payloads validated against Zod schemas in preload. Renderers never touch Node APIs.

### 13.4 Window Configuration
- **Settings:** standard frame, closable (closing hides; quitting only via tray menu).
- **Overlay:** `frame: false`, `fullscreen: true`, `alwaysOnTop: 'screen-saver'`, `skipTaskbar: true`, `focusable: true`, `closable: false`. `kiosk: true` when mode is Hardcore.
- **Blink pulse:** `frame: false`, `transparent: true`, `alwaysOnTop: true`, `skipTaskbar: true`, `focusable: false`, `setIgnoreMouseEvents(true)` for click-through.
- **Popover:** `frame: false`, `alwaysOnTop: true`, `skipTaskbar: true`, sized to content, positioned relative to tray icon bounds.

### 13.5 Multi-Display Handling
- `screen.getAllDisplays()` at break trigger; spawn one overlay per display.
- Listen on `screen.on('display-added')` / `display-removed` during a break to spawn/destroy overlays for hot-plug events.
- Existing overlays remain undisturbed by display changes mid-break.

### 13.6 Activity Detection
- Idle: `powerMonitor.getSystemIdleState(threshold)` polled at 30s.
- Fullscreen: Windows via `active-win` (or equivalent native module) polling at 5s intervals during normal operation, 1s during pre-break warning.
- Mic/cam: Windows via MMDevice / WASAPI session enumeration. Fallback: layer absent if unsupported.

### 13.7 Auto-Launch
- Windows: `app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true })`.
- Toggled live from settings; takes effect immediately.

### 13.8 Packaging & Distribution
- `electron-builder` for Windows NSIS installer. Code signing optional for v1.
- Manual updates: settings footer shows current version; click opens the project's downloads page. No `electron-updater` in v1.

---

## 14. v1 Non-Goals

Explicitly out of scope for the first release:

- Streaks, weekly/monthly history, charts, gamification.
- Full screen-reader compliance and `prefers-reduced-motion` handling beyond keyboard skip.
- macOS and Linux builds (architecture stays OS-agnostic; ship Windows-first).
- Auto-updates.
- Telemetry, analytics, crash reporting — zero network calls in v1.
- User accounts, sync, cloud backup.
- Parental controls or per-user profiles on the same machine.
- Custom ambient audio uploads (ship only the three included tracks).
- Per-day custom office hours schedules.
- Notifications for milestones, achievements, badges.
- Paid tier — Horizon is free, no licensing.
- Localization beyond English (en-US only).
- Per-app rules ("never break when Figma is focused").

---

## 15. Build-Time Decisions

Items deliberately left to the engineer to decide at implementation time:

- Exact native module vs. JS package for fullscreen / active-window detection on Windows (`active-win` is the default starting point).
- Specific sound assets — license-clear, seamlessly looped, ≥3 min source, crossfade-friendly.
- Tray icon visual treatment for Active vs. Paused states (subtle dot indicator likely sufficient).
- Whether the tray popover renders via a small `BrowserWindow` or a custom-positioned frameless window — default `BrowserWindow`.
- Exact `electron-store` schema shape — single flat object keyed by section name, Zod-validated.
- Whether to keep the schedule in-memory in the main process or persist last-break-time across restarts (recommend: persist, so a restart does not zero the timer).
