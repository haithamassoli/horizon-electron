import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useSettings } from '@/hooks/useSettings';
import type { Settings, AudioTrack } from '@shared/schemas';

type VisualAid = Settings['overlay']['visualAid'];
type AmbientAudio = Settings['overlay']['ambientAudio'];

const VISUAL_LABEL: Record<VisualAid, string> = {
  breathing: 'Breathing circle (4 · 7 · 8)',
  'twenty-twenty-twenty': '20 · 20 · 20',
  none: 'None'
};

const VISUAL_DESCRIPTION: Record<VisualAid, string> = {
  breathing: 'A slow circle paced to box breathing — inhale 4, hold 7, exhale 8.',
  'twenty-twenty-twenty': 'A calm reminder to look 20 feet away for 20 seconds.',
  none: 'Just the gradient and the countdown. Nothing more.'
};

const AUDIO_LABEL: Record<AmbientAudio, string> = {
  off: 'Off',
  rain: 'Rain',
  fire: 'Fire',
  lightning: 'Lightning'
};

const TRACKS: AudioTrack[] = ['rain', 'fire', 'lightning'];

export function OverlaySettings() {
  const { settings, ready, setVisualAid, setAmbientAudio } = useSettings();
  const [missing, setMissing] = useState<Set<AudioTrack>>(new Set());

  useEffect(() => {
    let active = true;
    void Promise.all(
      TRACKS.map(async (track) => {
        const { url } = await window.horizon.audio.getSrc(track);
        return { track, url };
      })
    ).then((results) => {
      if (!active) return;
      const next = new Set<AudioTrack>();
      for (const r of results) if (!r.url) next.add(r.track);
      setMissing(next);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!ready || !settings) return null;

  const { visualAid, ambientAudio } = settings.overlay;
  const audioMissing = ambientAudio !== 'off' && missing.has(ambientAudio as AudioTrack);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Break overlay</CardTitle>
        <CardDescription>
          What you see and hear during a break. Both apply on the next overlay.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-7">
        <Slot
          label="Visual aid"
          hint={VISUAL_DESCRIPTION[visualAid]}
          control={
            <Select
              value={visualAid}
              onValueChange={(v) => void setVisualAid(v as VisualAid)}
            >
              <SelectTrigger className="w-full max-w-[260px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(VISUAL_LABEL) as VisualAid[]).map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {VISUAL_LABEL[opt]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
          preview={<VisualPreview kind={visualAid} />}
        />

        <Slot
          label="Ambient audio"
          hint={
            audioMissing
              ? 'Track not bundled — drop the file in resources/audio to enable.'
              : 'Mastered to -18 LUFS. Fades in on break start and out on close.'
          }
          control={
            <div className="flex flex-col items-end gap-1.5">
              <Select
                value={ambientAudio}
                onValueChange={(v) => void setAmbientAudio(v as AmbientAudio)}
              >
                <SelectTrigger className="w-full max-w-[260px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(AUDIO_LABEL) as AmbientAudio[]).map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {AUDIO_LABEL[opt]}
                      {opt !== 'off' && missing.has(opt as AudioTrack) ? ' — missing file' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {ambientAudio !== 'off' && (
                <AudioPreviewButton track={ambientAudio as AudioTrack} disabled={audioMissing} />
              )}
            </div>
          }
          preview={<AudioPreview kind={ambientAudio} muted={audioMissing} />}
        />
      </CardContent>
    </Card>
  );
}

interface SlotProps {
  label: string;
  hint: string;
  control: ReactNode;
  preview: ReactNode;
}

function Slot({ label, hint, control, preview }: SlotProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-1 flex-col gap-1.5">
        <span className="text-sm font-light">{label}</span>
        <motion.span
          key={hint}
          initial={{ opacity: 0.65 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.22 }}
          className="text-xs text-muted-foreground"
        >
          {hint}
        </motion.span>
        <div className="mt-3 flex h-16 w-full items-center justify-center overflow-hidden rounded-md border border-border/70 bg-card/60">
          {preview}
        </div>
      </div>
      <div className="sm:w-[280px] sm:pt-1">{control}</div>
    </div>
  );
}

function VisualPreview({ kind }: { kind: VisualAid }) {
  if (kind === 'breathing') {
    return (
      <motion.div
        className="h-10 w-10 rounded-full"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, oklch(0.92 0.08 230 / 0.85), oklch(0.78 0.07 230 / 0.25) 60%, transparent 80%)',
          border: '1px solid oklch(0.78 0.07 230 / 0.4)'
        }}
        animate={{ scale: [1, 1.18, 1.18, 1], opacity: [0.7, 1, 1, 0.7] }}
        transition={{
          duration: 4.5,
          times: [0, 0.22, 0.6, 1],
          ease: 'easeInOut',
          repeat: Infinity
        }}
      />
    );
  }
  if (kind === 'twenty-twenty-twenty') {
    return (
      <span className="font-display text-base italic text-foreground/70">
        20 · 20 · 20
      </span>
    );
  }
  return (
    <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
      Quiet field
    </span>
  );
}

function AudioPreview({ kind, muted }: { kind: AmbientAudio; muted: boolean }) {
  if (kind === 'off') {
    return (
      <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
        Silent
      </span>
    );
  }
  return (
    <div className="flex items-end gap-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          className="block w-[3px] rounded-full bg-primary/60"
          animate={muted ? { height: 6 } : { height: [6, 18, 8, 22, 10, 6] }}
          transition={{
            duration: 1.6,
            delay: i * 0.12,
            ease: 'easeInOut',
            repeat: muted ? 0 : Infinity
          }}
        />
      ))}
    </div>
  );
}

interface AudioPreviewButtonProps {
  track: AudioTrack;
  disabled: boolean;
}

function AudioPreviewButton({ track, disabled }: AudioPreviewButtonProps) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    void window.horizon.audio.getSrc(track).then(({ url }) => {
      if (!active) return;
      urlRef.current = url;
    });
    return () => {
      active = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlaying(false);
    };
  }, [track]);

  const label = useMemo(() => (playing ? 'Stop preview' : 'Preview'), [playing]);

  function toggle(): void {
    if (disabled) return;
    if (audioRef.current && playing) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlaying(false);
      return;
    }
    const url = urlRef.current;
    if (!url) return;
    const el = new Audio(url);
    el.loop = true;
    el.volume = 0.4;
    void el.play();
    audioRef.current = el;
    setPlaying(true);
    el.addEventListener('ended', () => setPlaying(false));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
    >
      {label}
    </button>
  );
}
