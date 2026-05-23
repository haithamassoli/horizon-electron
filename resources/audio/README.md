# Ambient audio

Horizon's break overlay can play one of three royalty-free ambient tracks during a
break. Drop the audio files here, named exactly:

- `rain.mp3`
- `fire.mp3`
- `lightning.mp3`

## Sourcing

Pick license-clear, seamlessly looped tracks at least 3 minutes long. Master each to
roughly **−18 LUFS** so volumes stay consistent across tracks (the app has no volume
slider in v1). Loop points should be inaudible — crossfade-friendly recordings work
best.

Recommended sources:

- [Pixabay Music](https://pixabay.com/music/) — CC0
- [freesound.org](https://freesound.org/) — verify each clip's CC license
- [BBC Sound Effects](https://sound-effects.bbcrewind.co.uk/) — personal/educational only

## Runtime behavior

If a file is missing the setting is still visible, but the overlay treats that track
as silent and the settings dropdown shows "— missing file". Replace the file and
restart Horizon to pick it up.

## Packaging

Files in this directory are bundled into the installer via `electron-builder.yml`'s
`extraResources` block. They are not part of the renderer bundle — the main process
resolves them at runtime from `process.resourcesPath/audio/` (packaged) or
`<appPath>/resources/audio/` (dev).
