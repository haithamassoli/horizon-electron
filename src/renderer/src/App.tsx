import { SettingsDevPanel } from './views/SettingsDevPanel';
import { BreathingMark } from './components/BreathingMark';
import { motion } from 'motion/react';

export function App() {
  return (
    <main className="breathing-surface min-h-full">
      <div className="mx-auto flex max-w-2xl flex-col gap-12 px-8 pb-16 pt-14">
        <header className="flex items-start justify-between gap-6">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-xs uppercase tracking-[0.18em] text-muted-foreground"
            >
              Horizon — M1
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-5xl leading-[1.05] tracking-tight"
            >
              A quiet coach
              <span className="block italic text-primary/90">for your eyes.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-4 max-w-sm text-sm font-light text-muted-foreground"
            >
              Foundation milestone. Electron shell, secure IPC, typed schema store. The renderer
              is breathing.
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <BreathingMark size={80} />
          </motion.div>
        </header>

        <SettingsDevPanel />

        <footer className="border-t border-border/60 pt-6 text-xs font-light text-muted-foreground">
          <span className="font-display italic">Local-first.</span> No telemetry. No network calls.
        </footer>
      </div>
    </main>
  );
}
