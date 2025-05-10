import jwt from 'jsonwebtoken';
import { ipcMain } from 'electron';
import { User } from '../models/index.js';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('Missing JWT_SECRET');

// Register handler
ipcMain.handle('auth-register', async (_, { email, password }) => {
  if (!email || !password) {
    return { ok: false, message: 'All fields are required' };
  }

  // Check for existing email
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    return { ok: false, message: 'Email is already registered' };
  }

  try {
    const user = await User.create({ email, password });
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    return { ok: true, token };
  } catch (err) {
    console.error(err);
    return { ok: false, message: 'Internal server error' };
  }
});

// Login handler
ipcMain.handle('auth-login', async (_, { email, password }) => {
  if (!email || !password) {
    return { ok: false, message: 'All fields are required' };
  }

  const user = await User.findOne({ where: { email } });
  if (!user) {
    return { ok: false, message: 'User not found' };
  }

  const valid = await user.validPassword(password);
  if (!valid) {
    return { ok: false, message: 'Invalid credentials' };
  }

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
  return { ok: true, token };
});


ipcMain.handle('auth-getTokens', () => {
  return { accessToken: lastToken };
});