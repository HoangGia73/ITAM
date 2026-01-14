const express = require('express');
const { authenticate } = require('../middleware/auth');
const {
  getDevices,
  createDevice,
  updateDevice,
  markMaintenance,
  stats,
  issues,
  importDevices,
  deleteDevice,
  getDeviceByCode,
} = require('../controllers/deviceController');

const router = express.Router();

// Public lookup by device code for QR scans
router.get('/public/:code', getDeviceByCode);

router.get('/', authenticate, getDevices);
router.post('/', authenticate, createDevice);
router.post('/import', authenticate, importDevices);
router.put('/:id', authenticate, updateDevice);
router.delete('/:id', authenticate, deleteDevice);
router.post('/:id/maintenance', authenticate, markMaintenance);
router.get('/metrics/counts', authenticate, stats);
router.get('/issues/alerts', authenticate, issues);

module.exports = router;
