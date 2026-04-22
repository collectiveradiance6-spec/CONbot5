'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('CONbot5', {
  sendCommand: (cmd, payload) => ipcRenderer.invoke('send-command', cmd, payload),
  getConfig:   ()            => ipcRenderer.invoke('get-config'),
  version:     '5.0.0',
});
