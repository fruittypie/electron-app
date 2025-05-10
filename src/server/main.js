import { registerAuthHandlers } from './routes/auth.js';
import { sequelize, User } from './models/index.js';

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Postgres connected');
  } catch (err) {
    console.error('❌ Failed to connect to Postgres:', err);
  }
})();

// Register IPC handlers
registerAuthHandlers(ipcMain, User);