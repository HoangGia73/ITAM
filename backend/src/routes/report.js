const express = require('express');
const { authenticate } = require('../middleware/auth');
const { exportReport } = require('../controllers/reportController');

const router = express.Router();

router.get('/export', authenticate, exportReport);

module.exports = router;
