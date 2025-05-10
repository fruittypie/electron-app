import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import createUserModel from './User.js';
dotenv.config();

// initialize Sequelize with Postgres connection from env
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: false, // set to console.log for debugging
  });

// test connection
(async () => {
    try {
      await sequelize.authenticate();
      console.log('Postgres connected via Sequelize');
    } catch (err) {
      console.error('Sequelize connection error:', err);
    }
  })();

export const User = createUserModel(sequelize);
export { sequelize };