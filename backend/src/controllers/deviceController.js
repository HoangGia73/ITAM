const dayjs = require('dayjs');
const { Device, Assignment } = require('../models');
const { getAlerts } = require('../services/alertService');

const buildPrefix = (category) => {
  const base = (category || 'GEN').toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return (base.slice(0, 3) || 'GEN').padEnd(3, 'X');
};

const generateDeviceCode = async (category, transaction, cache) => {
  const prefix = buildPrefix(category);
  const useCache = cache || new Map();

  if (!useCache.has(prefix)) {
    const likePattern = `${prefix}-%`;
    const [rows] = await Device.sequelize.query(
      'SELECT code FROM "devices" WHERE code LIKE :likePattern ORDER BY code DESC LIMIT 1',
      { replacements: { likePattern }, transaction },
    );
    let next = 1;
    if (rows.length) {
      const match = /-(\d+)$/.exec(rows[0].code);
      if (match) next = Number(match[1]) + 1;
    }
    useCache.set(prefix, next);
  }

  const next = useCache.get(prefix);
  useCache.set(prefix, next + 1);
  return `${prefix}-${String(next).padStart(3, '0')}`;
};

const getDevices = async (req, res) => {
  const { status } = req.query;
  const where = status ? { status } : {};
  const devices = await Device.findAll({ where, order: [['id', 'DESC']] });
  res.json(
    devices.map((d) => ({
      ...d.toJSON(),
      warrantyEndDate: d.warrantyEndDate,
      maintenanceDue: d.maintenanceDue,
    })),
  );
};

const importDevices = async (req, res) => {
  const payload = req.body?.devices;
  if (!Array.isArray(payload) || payload.length === 0) {
    return res.status(400).json({ message: 'Danh sách thiết bị trống hoặc không hợp lệ' });
  }

  const rows = payload
    .map((d) => ({
      name: d.name,
      code: d.code,
      category: d.category || null,
      purchaseDate: d.purchaseDate,
      warrantyMonths: Number(d.warrantyMonths) || 12,
      lastMaintenanceDate: d.lastMaintenanceDate || d.purchaseDate,
      maintenanceIntervalDays: Number(d.maintenanceIntervalDays) || 30,
      status: 'available',
      lifecycleStatus: d.lifecycleStatus || 'normal',
      lifecycleReason: d.lifecycleReason || null,
      notes: d.notes || null,
    }))
    .filter((d) => d.name && d.purchaseDate);

  if (rows.length === 0) return res.status(400).json({ message: 'Không có thiết bị hợp lệ để import' });

  const transaction = await Device.sequelize.transaction();
  try {
    const rowsWithCode = rows.filter((r) => r.code);
    const existing = rowsWithCode.length
      ? await Device.findAll({ where: { code: rowsWithCode.map((r) => r.code) }, transaction })
      : [];
    const existingMap = new Map(existing.map((d) => [d.code, d]));

    const toCreate = [];
    const toUpdate = [];

    rows.forEach((row) => {
      const found = row.code ? existingMap.get(row.code) : null;
      if (found) {
        toUpdate.push({ id: found.id, ...row });
      } else {
        toCreate.push({ ...row, status: 'available' });
      }
    });

    const prefixCache = new Map();
    for (const row of toCreate) {
      if (!row.code) {
        row.code = await generateDeviceCode(row.category, transaction, prefixCache);
      }
    }

    if (toCreate.length) {
      await Device.bulkCreate(toCreate, { transaction });
    }

    await Promise.all(
      toUpdate.map((row) =>
        Device.update(
          {
            name: row.name,
            category: row.category,
            purchaseDate: row.purchaseDate,
            warrantyMonths: row.warrantyMonths,
            lastMaintenanceDate: row.lastMaintenanceDate,
            maintenanceIntervalDays: row.maintenanceIntervalDays,
            lifecycleStatus: row.lifecycleStatus,
            lifecycleReason: row.lifecycleReason,
            notes: row.notes,
          },
          { where: { id: row.id }, transaction },
        ),
      ),
    );

    await transaction.commit();
    res.json({ imported: toCreate.length, updated: toUpdate.length, total: rows.length });
  } catch (err) {
    await transaction.rollback();
    console.error('Import devices error', err);
    res.status(500).json({ message: 'Import thiết bị thất bại' });
  }
};

const createDevice = async (req, res) => {
  const payload = {
    name: req.body.name,
    category: req.body.category,
    purchaseDate: req.body.purchaseDate,
    warrantyMonths: req.body.warrantyMonths,
    lastMaintenanceDate: req.body.lastMaintenanceDate || req.body.purchaseDate,
    maintenanceIntervalDays: req.body.maintenanceIntervalDays || 30,
    status: 'available',
    lifecycleStatus: 'normal',
    lifecycleReason: null,
    notes: req.body.notes,
  };

  const transaction = await Device.sequelize.transaction();
  try {
    const code = req.body.code || (await generateDeviceCode(payload.category, transaction));
    const device = await Device.create({ ...payload, code }, { transaction });
    await transaction.commit();
    res.status(201).json(device);
  } catch (err) {
    await transaction.rollback();
    console.error('Create device error', err);
    res.status(500).json({ message: 'Không tạo được thiết bị' });
  }
};

const updateDevice = async (req, res) => {
  const { id } = req.params;
  const device = await Device.findByPk(id);
  if (!device) return res.status(404).json({ message: 'Not found' });
  const updates = {
    name: req.body.name ?? device.name,
    category: req.body.category ?? device.category,
    purchaseDate: req.body.purchaseDate ?? device.purchaseDate,
    warrantyMonths: req.body.warrantyMonths ?? device.warrantyMonths,
    maintenanceIntervalDays: req.body.maintenanceIntervalDays ?? device.maintenanceIntervalDays,
    lastMaintenanceDate: req.body.lastMaintenanceDate ?? device.lastMaintenanceDate,
    lifecycleStatus: req.body.lifecycleStatus ?? device.lifecycleStatus,
    lifecycleReason: req.body.lifecycleReason ?? device.lifecycleReason,
    notes: req.body.notes ?? device.notes,
  };
  await device.update(updates);
  res.json(device);
};

const deleteDevice = async (req, res) => {
  const { id } = req.params;
  const device = await Device.findByPk(id);
  if (!device) return res.status(404).json({ message: 'Not found' });
  await device.destroy();
  res.json({ message: 'Device deleted' });
};

const markMaintenance = async (req, res) => {
  const { id } = req.params;
  const device = await Device.findByPk(id);
  if (!device) return res.status(404).json({ message: 'Not found' });
  await device.update({ lastMaintenanceDate: dayjs().format('YYYY-MM-DD') });
  res.json({ message: 'Da cap nhat bao tri', device });
};

const stats = async (_req, res) => {
  const total = await Device.count();
  const assigned = await Device.count({ where: { status: 'assigned' } });
  const available = await Device.count({ where: { status: 'available' } });
  res.json({ total, assigned, available });
};

const issues = async (_req, res) => {
  const alerts = await getAlerts();
  res.json(alerts);
};

const getDeviceByCode = async (req, res) => {
  const { code } = req.params;
  if (!code) return res.status(400).json({ message: 'Missing device code' });

  const device = await Device.findOne({ where: { code } });
  if (!device) return res.status(404).json({ message: 'Device not found' });

  let assignment = null;
  if (device.status === 'assigned') {
    const latestIssue = await Assignment.findOne({
      where: { device_id: device.id, action: 'issue' },
      order: [['occurredAt', 'DESC']],
    });
    if (latestIssue) {
      assignment = {
        employeeName: latestIssue.employeeName,
        employeeCode: latestIssue.employeeCode,
        employeeEmail: latestIssue.employeeEmail,
        department: latestIssue.department,
        occurredAt: latestIssue.occurredAt,
        notes: latestIssue.notes || null,
      };
    }
  }

  res.json({
    ...device.toJSON(),
    warrantyEndDate: device.warrantyEndDate,
    maintenanceDue: device.maintenanceDue,
    assignment,
  });
};

module.exports = {
  getDevices,
  createDevice,
  updateDevice,
  markMaintenance,
  stats,
  issues,
  importDevices,
  deleteDevice,
  getDeviceByCode,
};
