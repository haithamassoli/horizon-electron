import { motion } from 'motion/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToday } from '@/hooks/useToday';
import { useSettings } from '@/hooks/useSettings';

interface Cell {
  key: string;
  label: string;
  value: number;
  accent?: boolean;
}

export function TodayPanel() {
  const { counters, ready } = useToday();
  const { settings } = useSettings();
  if (!ready || !counters) return null;

  const isHardcore = settings?.enforcementMode === 'hardcore';

  const cells: Cell[] = [
    { key: 'taken', label: 'Breaks taken', value: counters.breaksTaken, accent: true },
    { key: 'skipped', label: 'Breaks skipped', value: counters.breaksSkipped },
    ...(isHardcore
      ? []
      : [{ key: 'snoozes', label: 'Snoozes used', value: counters.snoozesUsed }]),
    { key: 'blinks', label: 'Blinks shown', value: counters.blinksShown }
  ];

  return (
    <Card className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,oklch(0.88_0.1_48_/_0.18),transparent_34%),radial-gradient(circle_at_92%_22%,oklch(0.8_0.08_145_/_0.13),transparent_30%)]"
      />
      <CardHeader>
        <div className="flex items-baseline justify-between gap-6">
          <div>
            <CardTitle>Today</CardTitle>
            <CardDescription>
              Quietly counted. Reset at midnight. <span className="font-mono">{counters.date}</span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="relative grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))`
          }}
        >
          {cells.map((cell) => (
            <TodayCell key={cell.key} cell={cell} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TodayCell({ cell }: { cell: Cell }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-background/45 px-3.5 py-3 shadow-[0_1px_0_oklch(1_0_0_/_0.62)_inset]">
      <motion.span
        key={cell.value}
        initial={{ opacity: 0.65, y: -2 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className={
          'text-[34px] font-extrabold leading-none tracking-[-0.055em] tabular-nums ' +
          (cell.accent ? 'text-primary/90' : 'text-foreground/85')
        }
      >
        {cell.value}
      </motion.span>
      <span className="mt-1.5 block text-[11px] font-bold leading-tight text-muted-foreground">
        {cell.label}
      </span>
    </div>
  );
}
