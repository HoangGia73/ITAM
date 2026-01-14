const path = require('path');
const { Sequelize } = require('sequelize');

// Load env even when process.cwd() is not backend/
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL?.trim();

const sequelize =
  connectionString && connectionString.length > 0
    ? new Sequelize(connectionString, {
        dialect: 'postgres',
        logging: false,
        define: { underscored: true, freezeTableName: true },
      })
    : new Sequelize(process.env.DB_NAME || 'itam', process.env.DB_USER || 'postgres', process.env.DB_PASS || 'postgres', {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        dialect: 'postgres',
        logging: false,
        define: { underscored: true, freezeTableName: true },
      });

module.exports = sequelize;
