const express = require('express');
const authRoutes = require('./auth');
const deviceRoutes = require('./device');
const assignmentRoutes = require('./assignment');
const reportRoutes = require('./report');
const userRoutes = require('./user');
const moduleRoutes = require('./module');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/devices', deviceRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/reports', reportRoutes);
router.use('/users', userRoutes);
router.use('/modules', moduleRoutes);

module.exports = router;
