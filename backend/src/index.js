const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');

// Ensure env is loaded when server is started from repo root
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { sequelize, User } = require('./models');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api', routes);
app.use(errorHandler);

const port = process.env.PORT || 5000;

const bootstrap = async () => {
  await sequelize.authenticate();
  await sequelize.sync();

  const admin = await User.findOne({ where: { email: 'admin@itam.local' } });
  if (!admin) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await User.create({
      name: 'Admin',
      email: 'admin@itam.local',
      passwordHash,
      role: 'ADMIN',
    });
    console.log('Created default admin: admin@itam.local / admin123');
  }

  app.listen(port, () => console.log(`API ready on port ${port}`));
};

bootstrap().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
