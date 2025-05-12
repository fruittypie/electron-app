const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('authAPI', {
  register: ({ email, password }) => ipcRenderer.invoke('auth-register', { email, password }),
  login: ({ email, password }) => ipcRenderer.invoke('auth-login', { email, password }),
  logout: (email) => ipcRenderer.invoke('auth-logout', { email }),
  verifyToken: (token) => ipcRenderer.invoke('auth-verify-token', { token }),
  notifyAuthSuccess: (token) => ipcRenderer.send('auth-success', { token }) ,
  getTokens: () => ipcRenderer.invoke('auth-getTokens')
});

contextBridge.exposeInMainWorld('electron', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
});