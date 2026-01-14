const { Op } = require('sequelize');
const dayjs = require('dayjs');
const { Assignment, Device, User } = require('../models');
const { exportAssignmentsToExcel } = require('../utils/excel');

const rangeToDates = (range) => {
  const now = dayjs();
  if (range === 'day') return { start: now.startOf('day'), end: now.endOf('day') };
  if (range === 'week') return { start: now.startOf('week'), end: now.endOf('week') };
  if (range === 'month') return { start: now.startOf('month'), end: now.endOf('month') };
  return null;
};

const exportReport = async (req, res) => {
  const { range, start, end } = req.query;
  let startDate = start;
  let endDate = end;

  if (range) {
    const preset = rangeToDates(range);
    if (preset) {
      startDate = preset.start.toDate();
      endDate = preset.end.toDate();
    }
  }

  const where = {};
  if (startDate && endDate) {
    where.occurredAt = { [Op.between]: [new Date(startDate), new Date(endDate)] };
  }

  const assignments = await Assignment.findAll({
    where,
    include: [
      { model: Device },
      { model: User, attributes: ['id', 'name', 'email', 'role'], required: false },
    ],
    order: [['occurredAt', 'DESC']],
  });

  const { buffer, filename } = await exportAssignmentsToExcel(assignments, `bao-cao-${range || 'custom'}`);

  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
};

module.exports = { exportReport };
