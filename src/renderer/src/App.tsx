import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { TodayPanel } from './views/TodayPanel';
import { BreaksSettings } from './views/BreaksSettings';
import { ModeSettings } from './views/ModeSettings';
import { SnoozeSettings } from './views/SnoozeSettings';
import { BlinkSettings } from './views/BlinkSettings';
import { OverlaySettings } from './views/OverlaySettings';
import { GeneralSettings } from './views/GeneralSettings';
import { OfficeHoursSettings } from './views/OfficeHoursSettings';
import { BreathingMark } from './components/BreathingMark';

const DOWNLOADS_URL = 'https://bional.github.io/horizon/downloads.html';

export function App() {
  return (
    <main className="breathing-surface min-h-full">
      <div className="mx-auto flex max-w-2xl flex-col gap-10 px-8 pb-16 pt-14">
        <motion.header
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } }
          }}
          className="flex items-start justify-between gap-6"
        >
          <div className="flex flex-col gap-3">
            <motion.span
              variants={{
                hidden: { opacity: 0, y: 4 },
                visible: { opacity: 1, y: 0 }
              }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-[10px] font-mono uppercase tracking-[0.32em] text-muted-foreground/70"
            >
              Horizon
            </motion.span>
            <motion.h1
              variants={{
                hidden: { opacity: 0, y: 8 },
                visible: { opacity: 1, y: 0 }
              }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-[44px] leading-[1.04] tracking-tight"
            >
              A quiet coach
              <span className="block italic text-primary/90">for your eyes.</span>
            </motion.h1>
            <motion.p
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1 }
              }}
              transition={{ duration: 0.6 }}
              className="max-w-sm text-sm font-light text-muted-foreground"
            >
              Everything tunes live. Lives in your tray. No telemetry — ever.
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <BreathingMark size={80} />
          </motion.div>
        </motion.header>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } }
          }}
          className="flex flex-col gap-10"
        >
          <Section>
            <TodayPanel />
          </Section>
          <Section>
            <GeneralSettings />
          </Section>
          <Section>
            <BreaksSettings />
          </Section>
          <Section>
            <ModeSettings />
          </Section>
          <Section>
            <SnoozeSettings />
          </Section>
          <Section>
            <BlinkSettings />
          </Section>
          <Section>
            <OfficeHoursSettings />
          </Section>
          <Section>
            <OverlaySettings />
          </Section>
        </motion.div>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="flex items-baseline justify-between border-t border-border/60 pt-6 text-xs font-light text-muted-foreground"
        >
          <span>
            <span className="font-display italic">Local-first.</span> No telemetry. No
            network calls.
          </span>
          <VersionLink />
        </motion.footer>
      </div>
    </main>
  );
}

function Section({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0 }
      }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function VersionLink() {
  const [version, setVersion] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void window.horizon.app.getVersion().then((v) => {
      if (active) setVersion(v);
    });
    return () => {
      active = false;
    };
  }, []);
  if (!version) return null;
  return (
    <button
      type="button"
      onClick={() => void window.horizon.app.openExternal(DOWNLOADS_URL)}
      className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80 transition-colors hover:text-foreground"
      aria-label={`Horizon v${version}, open downloads page`}
    >
      v{version}
    </button>
  );
}
