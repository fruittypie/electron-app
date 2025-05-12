import { app, BrowserWindow, ipcMain, safeStorage } from 'electron';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { isDev } from './util.js';
import { getPreloadPath } from './pathResolver.js';
import { startScraping } from './scraper/scraper.js'; 
import dotenv from 'dotenv';


dotenv.config();

app.on('ready', () => {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      preload: getPreloadPath(),
      additionalArguments: [`--jwt-secret=${process.env.JWT_SECRET}`],
    },
  });

  if (isDev()) {
    mainWindow.loadURL('http://localhost:5123');
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), '/dist-react/index.html'));
  }

  // path to store data
  const STORE_PATH = path.join(app.getPath('userData'), 'auth-store.json');
  const SETTINGS_PATH = path.join(app.getPath('userData'), 'scraper-settings.json');

  // load store from file
  let store = { users: {}, tokens: { accessToken: null, refreshToken: null } };
  try {
    const loaded = JSON.parse(fs.readFileSync(STORE_PATH));
    store = { ...store, ...loaded };
  } catch {}
  // load settings from file
  let settings = {};
  try {
    const loadedSettings = JSON.parse(fs.readFileSync(SETTINGS_PATH));
    settings = { ...settings, ...loadedSettings };
  } catch {}

  function saveStore() {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
  }

  function saveSettings() {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
  }

  // Token helpers
  function saveTokens({ accessToken, refreshToken }) {
    store.tokens = { accessToken, refreshToken };
    saveStore();
  }

  function getTokens() {
    return store.tokens;
  }

  // Register handler
  ipcMain.handle('auth-register', async (_, { email, password }) => {
    if (store.users[email]) {
      return { ok: false, message: 'Email already registered' };
    }

    const hash = await bcrypt.hash(password, 12);

    if (!safeStorage.isEncryptionAvailable()) {
      return { ok: false, message: 'Encryption not available on this platform' };
    }

    const encrypted = safeStorage.encryptString(hash).toString('base64');
    store.users[email] = encrypted;
    saveStore();

    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    saveTokens({ accessToken: token, refreshToken: null });

    return { ok: true, token };
  });

  // Login handler
  ipcMain.handle('auth-login', async (_, { email, password }) => {
    const encrypted = store.users[email];
    if (!encrypted) return { ok: false, message: 'User not found' };

    if (!safeStorage.isEncryptionAvailable()) {
      return { ok: false, message: 'Encryption not available' };
    }

    const buffer = Buffer.from(encrypted, 'base64');
    const savedHash = safeStorage.decryptString(buffer);
    const valid = await bcrypt.compare(password, savedHash);
    if (!valid) return { ok: false, message: 'Invalid credentials' };

    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    saveTokens({ accessToken: token, refreshToken: null });

    return { ok: true, token };
  });

  // Logout handler
  ipcMain.handle('auth-logout', async (_, { email }) => {
    delete store.users[email];
    store.tokens = { accessToken: null, refreshToken: null };
    saveStore();
    return { ok: true };
  });

  // Verify token
  ipcMain.handle('auth-verify-token', async (_, { token }) => {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      return { ok: true, payload };
    } catch {
      return { ok: false, message: 'Invalid or expired token' };
    }
  });

  // Get stored tokens
  ipcMain.handle('auth-getTokens', async () => {
    return getTokens();
  });

  ipcMain.on('auth-success', () => {
    console.log('Auth success!');
  });

  ipcMain.handle('get-scraper-settings', () => {
    return settings;
  });
  
  ipcMain.handle('save-scraper-settings', (event, newSettings) => {
    try {
      // merge new settings into existing ones
      settings = { ...settings, ...newSettings }; 
      saveSettings(); 
      return { success: true };
    } catch (error) {
      console.error('Failed to save settings:', error);
      return { success: false, error: error.message };
    }
  });

  // Handle start-puppeteer-scraper event
  ipcMain.handle('start-puppeteer-scraper', async (_, scraperSettings) => {
    // assign settings to the main process
    Object.assign(settings, scraperSettings); 
    // start Puppeteer script with settings
    await startScraping(settings); 
  });

});
