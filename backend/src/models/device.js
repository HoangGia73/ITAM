const { DataTypes } = require('sequelize');
const dayjs = require('dayjs');
const sequelize = require('../config/database');

const Device = sequelize.define(
  'devices',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      // Assignment status: available/assigned
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'available',
    },
    lifecycleStatus: {
      // Kỹ thuật: normal/maintenance/repair/in_transit/retired
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'normal',
      field: 'lifecycle_status',
    },
    lifecycleReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'lifecycle_reason',
    },
    purchaseDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'purchase_date',
    },
    warrantyMonths: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 12,
      field: 'warranty_months',
    },
    lastMaintenanceDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'last_maintenance_date',
    },
    maintenanceIntervalDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
      field: 'maintenance_interval_days',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    warrantyEndDate: {
      type: DataTypes.VIRTUAL,
      get() {
        const purchaseDate = this.getDataValue('purchaseDate');
        const months = this.getDataValue('warrantyMonths');
        if (!purchaseDate || !months) return null;
        return dayjs(purchaseDate).add(months, 'month').format('YYYY-MM-DD');
      },
    },
    maintenanceDue: {
      type: DataTypes.VIRTUAL,
      get() {
        const lastMaintenanceDate = this.getDataValue('lastMaintenanceDate');
        const interval = this.getDataValue('maintenanceIntervalDays') || 30;
        if (!lastMaintenanceDate) return true;
        return dayjs(lastMaintenanceDate).add(interval, 'day').isBefore(dayjs().add(1, 'day'), 'day');
      },
    },
  },
  {
    timestamps: true,
  },
);

module.exports = Device;
