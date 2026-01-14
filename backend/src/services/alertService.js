const dayjs = require('dayjs');
const { Device } = require('../models');

const getAlerts = async () => {
  const devices = await Device.findAll();
  const today = dayjs();

  const issues = devices.map((device) => {
    const warrantyEnd = device.warrantyEndDate ? dayjs(device.warrantyEndDate) : null;
    const warrantyExpired = warrantyEnd ? warrantyEnd.isBefore(today, 'day') : false;

    const maintenanceDue = device.maintenanceDue;

    return {
      device,
      warrantyExpired,
      maintenanceDue,
    };
  });

  const affected = issues.filter((d) => d.warrantyExpired || d.maintenanceDue);

  return {
    total: affected.length,
    warranty: affected.filter((d) => d.warrantyExpired).map((d) => d.device),
    maintenance: affected.filter((d) => d.maintenanceDue).map((d) => d.device),
  };
};

module.exports = { getAlerts };
