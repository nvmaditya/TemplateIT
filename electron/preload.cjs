const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('templateit', {
  listTemplates: () => ipcRenderer.invoke('templates:list'),
  getTemplate: (id) => ipcRenderer.invoke('templates:get', id),
  createTemplate: (data) => ipcRenderer.invoke('templates:create', data),
  updateTemplate: (id, patch) => ipcRenderer.invoke('templates:update', id, patch),
  deleteTemplate: (id) => ipcRenderer.invoke('templates:delete', id),
  listHistory: (templateId) => ipcRenderer.invoke('history:list', templateId),
  saveHistory: (templateId, payload) =>
    ipcRenderer.invoke('history:save', templateId, payload),
  getHistoryEntry: (id) => ipcRenderer.invoke('history:get', id),
  copyText: (text) => ipcRenderer.invoke('clipboard:write', text),
  dataDir: () => ipcRenderer.invoke('app:dataDir'),
});
