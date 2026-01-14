const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Assignment = sequelize.define(
  'assignments',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    employeeName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'employee_name',
    },
    employeeCode: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'employee_code',
    },
    department: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    employeeEmail: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
      field: 'employee_email',
    },
    action: {
      type: DataTypes.ENUM('issue', 'return'),
      allowNull: false,
    },
    occurredAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'occurred_at',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    returnReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'return_reason',
    },
    status: {
      type: DataTypes.ENUM('PENDING_CONFIRM', 'CONFIRMED', 'CANCELLED', 'FAILED', 'RETURNED'),
      allowNull: false,
      defaultValue: 'CONFIRMED',
    },
    confirmToken: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'confirm_token',
    },
    confirmTokenExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'confirm_token_expires_at',
    },
    confirmedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'confirmed_at',
    },
    confirmedIp: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'confirmed_ip',
    },
    confirmedUserAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'confirmed_user_agent',
    },
    documentUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'document_url',
    },
    documentName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'document_name',
    },
    documentGeneratedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'document_generated_at',
    },
  },
  {
    timestamps: true,
  },
);

module.exports = Assignment;
