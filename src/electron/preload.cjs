const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('authAPI', {
  register: ({ email, password }) => ipcRenderer.invoke('auth-register', { email, password }),
  login: ({ email, password }) => ipcRenderer.invoke('auth-login', { email, password }),
  logout: (email) => ipcRenderer.invoke('auth-logout', { email }),
  verifyToken: (token) => ipcRenderer.invoke('auth-verify-token', { token }),
  notifyAuthSuccess: (token) => ipcRenderer.send('auth-success', { token }) ,
  getTokens: () => ipcRenderer.invoke('auth-getTokens'),
  getSettings: () => ipcRenderer.invoke('get-scraper-settings'),
  saveSettings: newSettings => ipcRenderer.invoke('save-scraper-settings', newSettings)
});

contextBridge.exposeInMainWorld('electron', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, callback) => ipcRenderer.on(channel, callback),
  off: (channel, callback) => ipcRenderer.off(channel, callback),
});