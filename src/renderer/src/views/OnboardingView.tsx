import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { EnforcementMode, Settings } from '@shared/schemas';

interface ModeDescriptor {
  value: EnforcementMode;
  name: string;
  blurb: string;
  posture: string;
  gradient: string;
  glow: string;
}

const MODES: ModeDescriptor[] = [
  {
    value: 'casual',
    name: 'Casual',
    blurb: 'Skip anytime. The reminder is yours to take or leave.',
    posture: 'Easygoing',
    gradient:
      'linear-gradient(135deg, oklch(0.96 0.08 78 / 0.95), oklch(0.86 0.08 145 / 0.74))',
    glow: 'oklch(0.78 0.08 145 / 0.32)'
  },
  {
    value: 'balanced',
    name: 'Balanced',
    blurb: 'Seven calm seconds before skip unlocks. Long enough to breathe.',
    posture: 'Kind friction',
    gradient:
      'linear-gradient(135deg, oklch(0.9 0.12 50 / 0.96), oklch(0.84 0.08 28 / 0.82))',
    glow: 'oklch(0.76 0.12 48 / 0.45)'
  },
  {
    value: 'hardcore',
    name: 'Hardcore',
    blurb: 'No skip or snooze. A protected pause when you choose to commit.',
    posture: 'Protected',
    gradient:
      'linear-gradient(135deg, oklch(0.72 0.11 22 / 0.95), oklch(0.48 0.08 28 / 0.86))',
    glow: 'oklch(0.62 0.12 28 / 0.5)'
  }
];

export function OnboardingView() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selected, setSelected] = useState<EnforcementMode>('balanced');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    void window.horizon.settings
      .get()
      .then((s) => {
        if (!mounted) return;
        setSettings(s);
        setSelected(s.enforcementMode ?? 'balanced');
      })
      .catch(() => {
        /* fall back to defaults */
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function handleStart(): Promise<void> {
    if (submitting) return;
    setSubmitting(true);
    try {
      const base = settings ?? (await window.horizon.settings.get());
      if (base.enforcementMode !== selected) {
        await window.horizon.settings.set({ ...base, enforcementMode: selected });
      }
      await window.horizon.onboarding.complete();
    } catch (err) {
      console.error('[onboarding] start failed', err);
      setSubmitting(false);
    }
  }

  return (
    <main className="onboarding-shell">
      <Atmosphere />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="onboarding-frame"
      >
        <header className="onboarding-header">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="onboarding-eyebrow"
          >
            Horizon · v1
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="onboarding-title"
          >
            A quiet coach
            <span className="onboarding-title-accent"> for your eyes.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="onboarding-subtitle"
          >
            Pick a rhythm you can actually keep. Change it anytime in settings.
          </motion.p>
        </header>

        <section
          className="onboarding-grid"
          role="radiogroup"
          aria-label="Enforcement mode"
        >
          {MODES.map((m, i) => (
            <ModeCard
              key={m.value}
              descriptor={m}
              selected={selected === m.value}
              index={i}
              onSelect={() => setSelected(m.value)}
            />
          ))}
        </section>

        <footer className="onboarding-footer">
          <motion.button
            type="button"
            onClick={() => void handleStart()}
            disabled={submitting}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
            className="onboarding-cta"
            aria-busy={submitting}
          >
            <span className="onboarding-cta-label">
              {submitting ? 'Starting' : 'Start gently'}
            </span>
            <span aria-hidden className="onboarding-cta-arrow">
              →
            </span>
          </motion.button>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="onboarding-fineprint"
          >
            Lives in your tray. No account. No telemetry.
          </motion.span>
        </footer>
      </motion.div>
    </main>
  );
}

interface ModeCardProps {
  descriptor: ModeDescriptor;
  selected: boolean;
  index: number;
  onSelect: () => void;
}

function ModeCard({ descriptor, selected, index, onSelect }: ModeCardProps) {
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: 0.3 + index * 0.08,
        ease: [0.22, 1, 0.36, 1]
      }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      className={'onboarding-card' + (selected ? ' is-selected' : '')}
      style={{ ['--card-glow' as never]: descriptor.glow }}
    >
      <div aria-hidden className="onboarding-card-band" style={{ background: descriptor.gradient }}>
        <motion.span
          aria-hidden
          className="onboarding-card-shimmer"
          animate={selected ? { x: ['-30%', '120%'] } : { opacity: 0 }}
          transition={{
            duration: 3.4,
            ease: 'easeInOut',
            repeat: selected ? Infinity : 0,
            repeatDelay: 1.6
          }}
        />
      </div>

      <div className="onboarding-card-body">
        <div className="onboarding-card-row">
          <span className="onboarding-card-name">{descriptor.name}</span>
          <span className="onboarding-card-tag">{descriptor.posture}</span>
        </div>
        <p className="onboarding-card-blurb">{descriptor.blurb}</p>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.span
            aria-hidden
            key="ring"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="onboarding-card-ring"
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function Atmosphere() {
  return (
    <>
      <motion.div
        aria-hidden
        className="onboarding-atmos onboarding-atmos-a"
        animate={{
          opacity: [0.7, 0.95, 0.7],
          backgroundPosition: ['0% 20%', '30% 40%', '0% 20%']
        }}
        transition={{ duration: 22, ease: 'easeInOut', repeat: Infinity }}
      />
      <motion.div
        aria-hidden
        className="onboarding-atmos onboarding-atmos-b"
        animate={{
          opacity: [0.4, 0.7, 0.4],
          backgroundPosition: ['100% 70%', '60% 50%', '100% 70%']
        }}
        transition={{ duration: 28, ease: 'easeInOut', repeat: Infinity }}
      />
      <div aria-hidden className="onboarding-rule" />
    </>
  );
}
