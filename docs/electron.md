# xPilot Desktop (Electron)

The desktop app is a thin native shell around the hosted xPilot web app. It
loads the production site in a native window — it does **not** bundle the
Next.js server or database. This keeps the installer tiny and the desktop app
always in sync with production.

Primary target: **Windows** (for the China-market channel). macOS / Linux are
secondary and build on their own OS.

## Files

- `electron/main.js` — main process: window, menu, tray, single-instance lock,
  external-link handling (in-app navigation + Auth0 stay in-window; other links
  open in the system browser).
- `electron/preload.js` — exposes a minimal `window.xpilotDesktop` flag.
- `electron/make-icon.js` — regenerates `electron-resources/icon.png` from `public/logo.svg`
  (needs `sharp`). The committed `electron-resources/icon.png` is what packaging uses.
- `electron-builder.yml` — packaging config (Windows NSIS + portable first).

## Run locally (dev)

Point the shell at any URL with `XPILOT_DESKTOP_URL` (defaults to
`https://xpilot.jytech.us`):

```bash
npm run electron                 # loads production
npm run electron:dev             # loads http://localhost:3000 (run `npm run dev` too)
XPILOT_DESKTOP_URL=https://staging.example.com npm run electron
```

## Build the Windows installer

electron-builder generates the Windows `.ico` automatically from
`electron-resources/icon.png`.

```bash
npm run electron:build:win
```

Output lands in `dist-electron/` (`xPilot-<version>-Setup.exe` + a portable
`.exe`).

**Build host:** the Windows installer must be built on **Windows** (or Linux
with `wine` installed). A plain Linux box without wine can build the macOS/Linux
targets only. CI (GitHub Actions `windows-latest`) is the recommended way to
produce the signed `.exe`.

## Configuration

- `appId`: `us.jytech.xpilot`
- Override the loaded URL at runtime via the `XPILOT_DESKTOP_URL` env var.
