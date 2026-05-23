import { app, shell } from 'electron';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { registerHandler } from './registry';
import {
  ipcChannels,
  audioGetSrcRequestSchema,
  audioGetSrcResponseSchema,
  appOpenExternalRequestSchema,
  appOpenExternalResponseSchema,
  appGetVersionRequestSchema,
  appGetVersionResponseSchema,
  type AudioTrack
} from '@shared/schemas';

const TRACK_FILES: Record<AudioTrack, string> = {
  rain: 'rain.mp3',
  fire: 'fire.mp3',
  lightning: 'lightning.mp3'
};

function resolveTrackPath(track: AudioTrack): string | null {
  const file = TRACK_FILES[track];
  // Packaged: extraResources lands under process.resourcesPath. Dev: read from repo /resources.
  const packagedDir = path.join(process.resourcesPath, 'audio');
  const devDir = path.join(app.getAppPath(), 'resources', 'audio');
  for (const dir of [packagedDir, devDir]) {
    const candidate = path.join(dir, file);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export function registerAudioChannels(): void {
  registerHandler({
    channel: ipcChannels.audioGetSrc,
    request: audioGetSrcRequestSchema,
    response: audioGetSrcResponseSchema,
    handler: ({ track }) => {
      const fsPath = resolveTrackPath(track);
      return { url: fsPath ? pathToFileURL(fsPath).toString() : null };
    }
  });

  registerHandler({
    channel: ipcChannels.appOpenExternal,
    request: appOpenExternalRequestSchema,
    response: appOpenExternalResponseSchema,
    handler: ({ url }) => {
      void shell.openExternal(url);
      return undefined;
    }
  });

  registerHandler({
    channel: ipcChannels.appGetVersion,
    request: appGetVersionRequestSchema,
    response: appGetVersionResponseSchema,
    handler: () => ({ version: app.getVersion() })
  });
}
