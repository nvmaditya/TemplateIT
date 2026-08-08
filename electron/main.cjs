const { app, BrowserWindow, ipcMain, clipboard, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

// Domain store is ESM — load via dynamic import after ready
let store = null;

async function initStore() {
  const baseDir =
    process.env.TEMPLATEIT_DATA_DIR ||
    path.join(app.getPath('userData'), 'templateit');
  const storeUrl = pathToFileURL(
    path.join(__dirname, '..', 'src', 'domain', 'store.js')
  ).href;
  const { createStore } = await import(storeUrl);
  store = createStore(baseDir);
  return store;
}

function createWindow() {
  const iconPath = path.join(__dirname, '..', 'build', 'icon.png');
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#050505',
    title: 'TemplateIT',
    icon: iconPath,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, '..', 'src', 'renderer', 'index.html'));

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  return win;
}

function registerIpc() {
  ipcMain.handle('templates:list', (_e, opts) => store.listTemplates(opts || {}));
  ipcMain.handle('templates:get', (_e, id) => store.getTemplate(id));
  ipcMain.handle('templates:create', (_e, data) => store.createTemplate(data || {}));
  ipcMain.handle('templates:update', (_e, id, patch) => store.updateTemplate(id, patch || {}));
  ipcMain.handle('templates:delete', (_e, id) => store.deleteTemplate(id));
  ipcMain.handle('history:list', (_e, templateId) => store.listHistory(templateId));
  ipcMain.handle('history:save', (_e, templateId, payload) =>
    store.saveHistoryEntry(templateId, payload || {})
  );
  ipcMain.handle('history:get', (_e, id) => store.getHistoryEntry(id));
  ipcMain.handle('history:delete', (_e, id) => store.deleteHistoryEntry(id));
  ipcMain.handle('clipboard:write', (_e, text) => {
    clipboard.writeText(text == null ? '' : String(text));
    return true;
  });
  ipcMain.handle('app:dataDir', () => store.baseDir);
}

app.whenReady().then(async () => {
  await initStore();
  registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Export for smoke tests (require without launching)
module.exports = { initStore, registerIpc, createWindow };
