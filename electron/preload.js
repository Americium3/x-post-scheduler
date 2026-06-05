// Minimal, safe preload. Exposes a tiny read-only surface to the web app so it
// can detect it is running inside the xPilot desktop shell.
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("xpilotDesktop", {
  isDesktop: true,
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
  },
});
