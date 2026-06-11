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
      <div className="mx-auto flex max-w-3xl flex-col gap-7 px-7 pb-12 pt-10 sm:px-9">
        <motion.header
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } }
          }}
          className="glass-panel flex items-center justify-between gap-6 rounded-[1.75rem] px-7 py-6"
        >
          <div className="flex flex-col gap-2">
            <motion.span
              variants={{
                hidden: { opacity: 0, y: 4 },
                visible: { opacity: 1, y: 0 }
              }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80"
            >
              Horizon
            </motion.span>
            <motion.h1
              variants={{
                hidden: { opacity: 0, y: 8 },
                visible: { opacity: 1, y: 0 }
              }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-lg text-[34px] font-extrabold leading-[1.02] tracking-[-0.045em] sm:text-[42px]"
            >
              A quiet coach
              <span className="block font-display italic font-normal text-primary/95">for your eyes.</span>
            </motion.h1>
            <motion.p
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1 }
              }}
              transition={{ duration: 0.6 }}
              className="max-w-md text-sm font-medium leading-relaxed text-muted-foreground"
            >
              Smart breaks, blink nudges, and a softer full-screen pause. Local-first, no telemetry.
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <BreathingMark size={72} />
          </motion.div>
        </motion.header>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } }
          }}
          className="flex flex-col gap-5"
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
          className="flex items-baseline justify-between px-2 pt-2 text-xs font-medium text-muted-foreground"
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
