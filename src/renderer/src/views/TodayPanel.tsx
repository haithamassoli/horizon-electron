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
    <Card>
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
          className="grid gap-x-8 gap-y-4"
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
    <div className="flex flex-col gap-1.5">
      <motion.span
        key={cell.value}
        initial={{ opacity: 0.65, y: -2 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className={
          'font-display text-4xl leading-none tracking-tight tabular-nums ' +
          (cell.accent ? 'text-primary/90' : 'text-foreground/85')
        }
      >
        {cell.value}
      </motion.span>
      <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {cell.label}
      </span>
    </div>
  );
}
