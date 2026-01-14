const sequelize = require('../config/database');
const User = require('./user');
const Device = require('./device');
const Assignment = require('./assignment');

User.hasMany(Assignment, { foreignKey: 'user_id' });
Assignment.belongsTo(User, { foreignKey: 'user_id' });

Device.hasMany(Assignment, { foreignKey: 'device_id' });
Assignment.belongsTo(Device, { foreignKey: 'device_id' });

module.exports = {
  sequelize,
  User,
  Device,
  Assignment,
};
