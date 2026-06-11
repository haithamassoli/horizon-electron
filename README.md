# Horizon

A quiet coach for your eyes. Windows v1 ships as an unsigned NSIS installer.

## Build

```powershell
npm install
npm run dist:win
```

Installer output lands in `dist/`.

## Tests

```powershell
npm run build
npm run test:electron
```

## Code Signing

No signing certificate is configured for v1. Windows SmartScreen may show an `Unknown publisher` warning. Verify the installer came from the official GitHub Release before installing.
