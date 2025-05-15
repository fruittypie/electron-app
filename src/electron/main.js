import { app, BrowserWindow, ipcMain, safeStorage } from 'electron';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { Client, GatewayIntentBits } from 'discord.js';
import { isDev } from './util.js';
import { getPreloadPath } from './pathResolver.js';
import { startScraping, stopScraping } from './scraper/scraper.js';
import { orderProduct } from './scraper/orderService.js';
import { initComm } from './scraper/communication.js';

dotenv.config();

// Paths for persisting data
const STORE_PATH    = path.join(app.getPath('userData'), 'auth-store.json');
const SETTINGS_PATH = path.join(app.getPath('userData'), 'scraper-settings.json');

// In-memory state
let isScraperRunning = false;
let mainWindow;
let scraperBrowser = null;
let store = { users: {}, tokens: { accessToken: null, refreshToken: null } };
let settings = {};

// Helpers to load/save JSON
function saveStore() {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}
function saveSettings() {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

// Initialize store and settings from disk
try {
  const data = fs.readFileSync(STORE_PATH);
  store = { ...store, ...JSON.parse(data) };
} catch {}
try {
  const data = fs.readFileSync(SETTINGS_PATH);
  settings = { ...settings, ...JSON.parse(data) };
} catch {}

// Notify renderer that scraping finished
function emitFinished() {
  if (mainWindow) mainWindow.webContents.send('scraper-finished');
}

// App ready: create window, set up communication
app.whenReady().then(async () => {
  // Create main window
  mainWindow = new BrowserWindow({
    webPreferences: {
      preload: getPreloadPath(),
      additionalArguments: [`--jwt-secret=${process.env.JWT_SECRET}`]
    }
  });

  // Load UI
  if (isDev()) {
    mainWindow.loadURL('http://localhost:5123');
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), '/dist-react/index.html'));
  }

  // Set up Discord client if needed
  const discordClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
  if (settings.notifyDiscord) {
    try {
      await discordClient.login(process.env.TOKEN);
    } catch (err) {
      console.error('Discord login failed:', err);
    }
  }

  // Initialize communication hub (for IPC & Discord)
  initComm({ window: mainWindow, discord: discordClient, userSettings: settings });
});

// ========== IPC Handlers ========== //

// Authentication handlers
ipcMain.handle('auth-register', async (_, { email, password }) => {
  if (store.users[email]) return { ok: false, message: 'Email already registered' };
  const hash = await bcrypt.hash(password, 12);
  if (!safeStorage.isEncryptionAvailable()) {
    return { ok: false, message: 'Encryption not available' };
  }
  const encrypted = safeStorage.encryptString(hash).toString('base64');
  store.users[email] = encrypted;
  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
  store.tokens = { accessToken: token, refreshToken: null };
  saveStore();
  return { ok: true, token };
});

ipcMain.handle('auth-login', async (_, { email, password }) => {
  const encrypted = store.users[email];
  if (!encrypted) return { ok: false, message: 'User not found' };
  if (!safeStorage.isEncryptionAvailable()) {
    return { ok: false, message: 'Encryption not available' };
  }
  const savedHash = safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
  if (!await bcrypt.compare(password, savedHash)) {
    return { ok: false, message: 'Invalid credentials' };
  }
  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
  store.tokens = { accessToken: token, refreshToken: null };
  saveStore();
  return { ok: true, token };
});

ipcMain.handle('auth-logout', async (_, { email }) => {
  delete store.users[email];
  store.tokens = { accessToken: null, refreshToken: null };
  saveStore();
  return { ok: true };
});

ipcMain.handle('auth-verify-token', async (_, { token }) => {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return { ok: true, payload };
  } catch {
    return { ok: false, message: 'Invalid or expired token' };
  }
});

ipcMain.handle('auth-getTokens', async () => ({ accessToken: store.tokens.accessToken, refreshToken: store.tokens.refreshToken }));

// Settings handlers
ipcMain.handle('get-scraper-settings', () => settings);
ipcMain.handle('save-scraper-settings', (_, newSettings) => {
  settings = { ...settings, ...newSettings };
  saveSettings();
  return { success: true };
});

// Scraper control handlers
ipcMain.handle('start-puppeteer-scraper', (_, scraperSettings) => {
  Object.assign(settings, scraperSettings);
  saveSettings();
  isScraperRunning = true;

  startScraping(settings)
    .then(() => {
      isScraperRunning = false;
      scraperBrowser = null;
      emitFinished();
    })
    .catch(err => {
      console.error('Scraper error:', err);
      isScraperRunning = false;
      scraperBrowser = null;
      emitFinished();
    });
  return { started: true };
});

ipcMain.handle('stop-puppeteer-scraper', () => {
  stopScraping();
  return { stopping: true };
});

// In-app order handlers
ipcMain.handle('order-product', async (_, product) => {
  if (!isScraperRunning || !scraperBrowser) {
    return { success: false, error: 'Scraper is not running.' };
  }
  try {
    await orderProduct(product, scraperBrowser, settings);
    return { success: true };
  } catch (err) {
    console.error('Order failed:', err);
    return { success: false, error: err.message };
  }
});


ipcMain.handle('skip-product', (_, product) => {
  return { success: true };
});

// Ensure the app quits cleanly on all windows closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
