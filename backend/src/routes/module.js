const express = require('express');
const { listModules } = require('../controllers/moduleController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, listModules);

module.exports = router;
