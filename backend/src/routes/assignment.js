const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  createAssignment,
  listAssignments,
  listActiveAssignees,
  exportAssignments,
  deleteAssignment,
  resendIssueEmail,
} = require('../controllers/assignmentController');
const { confirmAssignment, cancelAssignment, resendConfirmEmail } = require('../controllers/confirmController');

const router = express.Router();

router.get('/', authenticate, listAssignments);
router.get('/active', authenticate, listActiveAssignees);
router.post('/', authenticate, createAssignment);
router.get('/export', authenticate, exportAssignments);
router.post('/confirm', confirmAssignment);
router.get('/confirm', confirmAssignment);
router.post('/confirm-resend', resendConfirmEmail);
router.post('/:id/resend-email', authenticate, resendIssueEmail);
router.post('/:id/cancel', authenticate, cancelAssignment);
router.delete('/:id', authenticate, requireRole(['ADMIN']), deleteAssignment);

module.exports = router;
