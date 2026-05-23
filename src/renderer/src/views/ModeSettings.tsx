import { motion } from 'motion/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSettings } from '@/hooks/useSettings';
import type { EnforcementMode } from '@shared/schemas';

interface ModeDescriptor {
  value: EnforcementMode;
  name: string;
  blurb: string;
  vibe: string;
  gradient: string;
  glow: string;
}

const MODES: ModeDescriptor[] = [
  {
    value: 'casual',
    name: 'Casual',
    blurb: 'Skip anytime. Trust yourself to take the breaks that matter.',
    vibe: 'Permissive',
    gradient:
      'linear-gradient(135deg, oklch(0.92 0.05 200 / 0.9), oklch(0.86 0.07 230 / 0.7))',
    glow: 'oklch(0.78 0.07 220 / 0.32)'
  },
  {
    value: 'balanced',
    name: 'Balanced',
    blurb: 'A seven-second pause. Enough to breathe before you decide.',
    vibe: 'Suggested',
    gradient:
      'linear-gradient(135deg, oklch(0.85 0.08 220 / 0.95), oklch(0.74 0.09 250 / 0.8))',
    glow: 'oklch(0.78 0.08 235 / 0.42)'
  },
  {
    value: 'hardcore',
    name: 'Hardcore',
    blurb: 'No skip. No snooze. The break is the work.',
    vibe: 'Firm',
    gradient:
      'linear-gradient(135deg, oklch(0.62 0.12 260 / 0.95), oklch(0.42 0.1 280 / 0.85))',
    glow: 'oklch(0.6 0.13 270 / 0.45)'
  }
];

export function ModeSettings() {
  const { settings, ready, setEnforcementMode } = useSettings();
  if (!ready || !settings) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enforcement</CardTitle>
        <CardDescription>
          How firmly Horizon insists. Switch any time — applies on the next break.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          role="radiogroup"
          aria-label="Enforcement mode"
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          {MODES.map((m) => (
            <ModeCard
              key={m.value}
              descriptor={m}
              selected={settings.enforcementMode === m.value}
              onSelect={() => void setEnforcementMode(m.value)}
            />
          ))}
        </div>

        {settings.enforcementMode === 'hardcore' && (
          <p className="mt-5 text-[11px] font-light leading-relaxed text-muted-foreground">
            Emergency exit: hold{' '}
            <kbd className="rounded-sm border border-border/70 bg-muted px-1.5 py-0.5 font-mono text-[10px] tracking-tight text-foreground/80">
              Ctrl
            </kbd>{' '}
            +{' '}
            <kbd className="rounded-sm border border-border/70 bg-muted px-1.5 py-0.5 font-mono text-[10px] tracking-tight text-foreground/80">
              Shift
            </kbd>{' '}
            +{' '}
            <kbd className="rounded-sm border border-border/70 bg-muted px-1.5 py-0.5 font-mono text-[10px] tracking-tight text-foreground/80">
              Esc
            </kbd>{' '}
            for 5 seconds during a break.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface ModeCardProps {
  descriptor: ModeDescriptor;
  selected: boolean;
  onSelect: () => void;
}

function ModeCard({ descriptor, selected, onSelect }: ModeCardProps) {
  const { name, blurb, vibe, gradient, glow } = descriptor;
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      className={
        'group relative flex flex-col gap-0 overflow-hidden rounded-xl border text-left transition-colors duration-200 ' +
        (selected
          ? 'border-primary/70 bg-card shadow-[0_0_0_1px_oklch(0.78_0.07_230_/_0.25),0_18px_38px_-22px_oklch(0.45_0.08_240_/_0.45)]'
          : 'border-border/70 bg-card hover:border-border')
      }
      style={selected ? { ['--mode-glow' as never]: glow } : {}}
    >
      <div
        aria-hidden
        className="relative h-20 w-full"
        style={{ background: gradient }}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-70"
          style={{
            background:
              'radial-gradient(120% 100% at 80% 20%, oklch(1 0 0 / 0.32), transparent 60%)'
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 border-b border-white/10"
        />
        <motion.span
          aria-hidden
          animate={selected ? { opacity: [0.3, 0.55, 0.3] } : { opacity: 0 }}
          transition={{ duration: 5, ease: 'easeInOut', repeat: Infinity }}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, oklch(1 0 0 / 0.8), transparent)'
          }}
        />
      </div>

      <div className="flex flex-col gap-1.5 px-4 py-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-display text-lg leading-none tracking-tight">{name}</span>
          <span
            className={
              'rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] transition-colors ' +
              (selected
                ? 'bg-primary/15 text-primary-foreground/90'
                : 'bg-muted text-muted-foreground')
            }
          >
            {vibe}
          </span>
        </div>
        <p className="text-xs font-light leading-relaxed text-muted-foreground">{blurb}</p>
      </div>

      {selected && (
        <motion.span
          aria-hidden
          layoutId="mode-glow"
          className="pointer-events-none absolute -inset-px rounded-xl"
          style={{
            boxShadow: `0 0 0 1px oklch(0.78 0.07 230 / 0.55), 0 0 32px var(--mode-glow)`
          }}
          transition={{ type: 'spring', stiffness: 240, damping: 26 }}
        />
      )}
    </motion.button>
  );
}
