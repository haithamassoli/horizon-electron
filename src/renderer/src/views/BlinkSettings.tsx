import { AnimatePresence, motion } from 'motion/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useSettings } from '@/hooks/useSettings';

export function BlinkSettings() {
  const { settings, ready, setBlinkEnabled, setBlinkIntervalMinutes } = useSettings();
  if (!ready || !settings) return null;

  const { enabled, intervalMinutes } = settings.blink;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle>Blink reminder</CardTitle>
            <CardDescription>
              A soft pulse at the screen edges nudges you to blink. Silent during meetings,
              fullscreen, idle, and pause — it stays out of your way.
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1.5 pt-1">
            <Switch
              checked={enabled}
              onCheckedChange={(v) => void setBlinkEnabled(v)}
              aria-label="Toggle blink reminder"
            />
            <motion.span
              key={enabled ? 'on' : 'off'}
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
            >
              {enabled ? 'on' : 'off'}
            </motion.span>
          </div>
        </div>
      </CardHeader>

      <AnimatePresence initial={false}>
        {enabled && (
          <motion.div
            key="blink-interval"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-6">
                <div className="flex flex-col">
                  <span className="text-sm font-light">Pulse interval</span>
                  <span className="text-xs text-muted-foreground">
                    How often the gentle reminder appears.
                  </span>
                </div>
                <motion.span
                  key={intervalMinutes}
                  initial={{ opacity: 0.6, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="font-mono text-xs tabular-nums text-foreground/80"
                >
                  every {intervalMinutes} min
                </motion.span>
              </div>
              <Slider
                min={1}
                max={30}
                step={1}
                value={[intervalMinutes]}
                onValueChange={([v]) => v !== undefined && void setBlinkIntervalMinutes(v)}
              />
              <div className="flex justify-between px-0.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
                <span>1 min</span>
                <span>15</span>
                <span>30 min</span>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
