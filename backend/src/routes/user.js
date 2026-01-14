const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { listUsers, createUser, updateUser } = require('../controllers/userController');

const router = express.Router();

router.get('/', authenticate, requireRole(['ADMIN']), listUsers);
router.post('/', authenticate, requireRole(['ADMIN']), createUser);
router.put('/:id', authenticate, requireRole(['ADMIN']), updateUser);

module.exports = router;
