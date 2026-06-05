// xPilot desktop shell (Electron).
// The desktop app is a thin native client for the hosted xPilot web app, so it
// loads the production URL in a BrowserWindow. No Next.js bundle is shipped.
const { app, BrowserWindow, Menu, Tray, shell, nativeImage } = require("electron");
const path = require("path");

// Target web app URL. Override with XPILOT_DESKTOP_URL for staging/local dev.
const APP_URL = process.env.XPILOT_DESKTOP_URL || "https://xpilot.jytech.us";
const APP_ORIGIN = (() => {
  try {
    return new URL(APP_URL).origin;
  } catch {
    return "https://xpilot.jytech.us";
  }
})();

const isDev = !app.isPackaged;
let mainWindow = null;
let tray = null;

function iconPath() {
  return path.join(__dirname, "..", "electron-resources", "icon.png");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: "#0b0b0f",
    autoHideMenuBar: true, // hide the menu bar by default (toggle with Alt)
    icon: iconPath(),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
    },
  });

  mainWindow.loadURL(APP_URL);

  // Open external links (window.open / target=_blank) in the system browser.
  // Same-origin navigations (incl. Auth0 redirect back to the app) stay in-window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const sameOrigin = new URL(url).origin === APP_ORIGIN;
      // Auth providers must stay inside the app window to complete login.
      const isAuth = /auth0\.com|accounts\.google\.com|login\.|oauth/i.test(url);
      if (sameOrigin || isAuth) return { action: "allow" };
    } catch {
      /* fall through to external */
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function buildMenu() {
  const template = [
    {
      label: "xPilot",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        ...(isDev ? [{ role: "toggleDevTools" }, { type: "separator" }] : []),
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createTray() {
  try {
    const img = nativeImage.createFromPath(iconPath());
    if (img.isEmpty()) return;
    tray = new Tray(img.resize({ width: 16, height: 16 }));
    tray.setToolTip("xPilot");
    tray.setContextMenu(
      Menu.buildFromTemplate([
        {
          label: "Open xPilot",
          click: () => {
            if (mainWindow) mainWindow.show();
            else createWindow();
          },
        },
        { type: "separator" },
        { role: "quit" },
      ]),
    );
    tray.on("click", () => {
      if (mainWindow) {
        mainWindow.isVisible() ? mainWindow.focus() : mainWindow.show();
      } else {
        createWindow();
      }
    });
  } catch {
    /* tray is optional */
  }
}

// Single-instance lock: focus the existing window instead of opening a second.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    buildMenu();
    createWindow();
    createTray();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
