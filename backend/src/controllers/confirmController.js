const path = require('path');
const fs = require('fs').promises;
const dayjs = require('dayjs');
const { Assignment, Device, User } = require('../models');
const { hashToken, isExpired, generateConfirmToken } = require('../utils/assignmentToken');
const { sendMail, sendIssueConfirmEmail } = require('../utils/mailer');
const { generateAssignmentDocument } = require('../services/pdfService');

const renderHtml = (title, message) => `
<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; background:#0f172a; color:#e2e8f0; display:flex; align-items:center; justify-content:center; height:100vh; }
      .card { background:#111827; border:1px solid #1f2937; padding:24px 28px; border-radius:12px; max-width:480px; box-shadow:0 10px 30px rgba(0,0,0,0.35); }
      h1 { margin:0 0 12px; font-size:20px; color:#22c55e; }
      p { margin:0; line-height:1.6; color:#cbd5e1; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${title}</h1>
      <p>${message}</p>
    </div>
  </body>
</html>
`;

const notifyAdminExpired = async ({ assignment, device }) => {
  try {
    const admins = await User.findAll({ where: { role: 'ADMIN', active: true } });
    const adminEmails = admins.map((admin) => admin.email).filter(Boolean);
    if (adminEmails.length === 0) return;

    const deviceLabel = device ? `${device.name} (${device.code})` : 'unknown device';
    const subject = `Confirm expired for assignment #${assignment.id}`;
    const html = `
      <p>Assignment confirm token expired after 30 minutes.</p>
      <ul>
        <li>Assignment: <b>#${assignment.id}</b></li>
        <li>Employee: ${assignment.employeeName} (${assignment.employeeCode})</li>
        <li>Device: ${deviceLabel}</li>
        <li>Email: ${assignment.employeeEmail}</li>
      </ul>
      <p>Please resend the confirmation email in the history page.</p>
    `;

    await sendMail({
      to: adminEmails.join(','),
      subject,
      html,
    });
  } catch (error) {
    console.error('Notify admin expired confirm error', error);
  }
};

const confirmAssignment = async (req, res) => {
  try {
    const token = req.body?.token || req.query?.token;
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    const tokenHash = hashToken(token);
    const assignment = await Assignment.findOne({
      where: { confirmToken: tokenHash },
      include: [{ model: Device }],
    });

    if (!assignment) {
      const msg = { message: 'Token không hợp lệ' };
      if (req.accepts('html')) return res.status(400).send(renderHtml('Xác nhận thất bại', msg.message));
      return res.status(400).json(msg);
    }

    if (assignment.status === 'CONFIRMED') {
      const payload = {
        ok: true,
        alreadyConfirmed: true,
        code: assignment.id,
        deviceCode: assignment.Device?.code || null,
        employeeName: assignment.employeeName,
      };
      if (req.accepts('html')) return res.send(renderHtml('Đã xác nhận trước đó', `Phiếu ${assignment.id} đã được xác nhận.`));
      return res.json(payload);
    }

    if (isExpired(assignment.confirmTokenExpiresAt)) {
      const alreadyExpired = assignment.notes === 'Token h???t h???n';
      await assignment.update({
        status: 'PENDING_CONFIRM',
        notes: 'Token h???t h???n',
      });
      if (!alreadyExpired) {
        const device = assignment.Device || (await Device.findByPk(assignment.device_id));
        await notifyAdminExpired({ assignment, device });
      }
      const msg = { message: 'Token ?`A? h???t h???n', code: 'TOKEN_EXPIRED' };
      if (req.accepts('html')) return res.status(400).send(renderHtml('XA?c nh??-n th???t b???i', msg.message));
      return res.status(400).json(msg);
    }

    if (assignment.status !== 'PENDING_CONFIRM') {
      return res.status(400).json({ message: 'Phiếu không ở trạng thái chờ xác nhận' });
    }

    const device = assignment.Device || (await Device.findByPk(assignment.device_id));
    if (!device) {
      await assignment.update({ status: 'FAILED', notes: 'Thiết bị không tồn tại khi confirm' });
      const msg = { message: 'Thiết bị không tồn tại' };
      if (req.accepts('html')) return res.status(404).send(renderHtml('Xác nhận thất bại', msg.message));
      return res.status(404).json(msg);
    }

    if (device.status !== 'available') {
      await assignment.update({ status: 'FAILED', notes: 'Thiết bị không còn available khi confirm' });
      const msg = { message: 'Thiết bị không còn sẵn sàng để cấp' };
      if (req.accepts('html')) return res.status(409).send(renderHtml('Xác nhận thất bại', msg.message));
      return res.status(409).json(msg);
    }

    const now = new Date();

    await device.update({ status: 'assigned' });
    await assignment.update({
      status: 'CONFIRMED',
      confirmedAt: now,
      confirmedIp: req.ip,
      confirmedUserAgent: req.get('user-agent'),
      confirmToken: null,
    });

    console.info('CONFIRM_RECEIVED', {
      assignmentId: assignment.id,
      time: now.toISOString(),
    });

    const result = {
      ok: true,
      code: assignment.id,
      deviceCode: device.code,
      employeeName: assignment.employeeName,
    };

    if (req.accepts('html')) return res.send(renderHtml('Xác nhận thành công', `Phiếu ${assignment.id} cho thiết bị ${device.code} đã được xác nhận.`));
    return res.json(result);
  } catch (error) {
    console.error('Confirm assignment error', error);
    const msg = { message: error?.message || 'Internal server error' };
    if (req.accepts('html')) return res.status(500).send(renderHtml('Xác nhận thất bại', msg.message));
    return res.status(500).json(msg);
  }
};

const resendConfirmEmail = async (req, res) => {
  try {
    const token = req.body?.token || req.query?.token;
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    const tokenHash = hashToken(token);
    const assignment = await Assignment.findOne({
      where: { confirmToken: tokenHash },
      include: [{ model: Device }],
    });

    if (!assignment) {
      return res.status(400).json({ message: 'Token invalid' });
    }

    if (assignment.status === 'CONFIRMED') {
      return res.status(400).json({ message: 'Already confirmed' });
    }

    if (assignment.action !== 'issue') {
      return res.status(400).json({ message: 'Invalid assignment action' });
    }

    const device = assignment.Device || (await Device.findByPk(assignment.device_id));
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    const confirmMeta = generateConfirmToken(0.5);
    const confirmBase =
      process.env.FRONTEND_CONFIRM_URL ||
      process.env.FRONTEND_URL ||
      'http://localhost:3000/confirm-assignment';
    const confirmUrl = `${confirmBase.replace(/\/$/, '')}?token=${confirmMeta.token}`;
    const subject = `Confirm asset receipt - ${device.code}`;
    const expiresText = dayjs(confirmMeta.expiresAt).format('DD/MM/YYYY HH:mm');

    const assignmentData = assignment.get({ plain: true });
    const deviceData = device.get({ plain: true });
    let pdfAttachment = null;

    try {
      const { buffer, fileName } = await generateAssignmentDocument({
        assignment: assignmentData,
        device: deviceData,
        employee: {
          name: assignment.employeeName,
          code: assignment.employeeCode,
          email: assignment.employeeEmail,
          department: assignment.department,
        },
        action: 'issue',
      });

      const uploadDir = path.join(__dirname, '../../uploads/assignments');
      await fs.mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, fileName);
      await fs.writeFile(filePath, buffer);

      const documentUrl = `/uploads/assignments/${fileName}`;
      const documentGeneratedAt = new Date();

      await assignment.update({
        documentUrl,
        documentName: fileName,
        documentGeneratedAt,
      });

      pdfAttachment = { filename: fileName, content: buffer };
    } catch (error) {
      console.error('Generate assignment PDF (resend token) error', error);
    }

    await assignment.update({
      confirmToken: confirmMeta.tokenHash,
      confirmTokenExpiresAt: confirmMeta.expiresAt,
      status: 'PENDING_CONFIRM',
    });

    const html = `
      <p>Chao ${assignment.employeeName},</p>
      <p>Ban co mot yeu cau nhan tai san can xac nhan.</p>
      <ul>
        <li>Thiet bi: <b>${device.name}</b> (${device.code})</li>
        <li>Phong ban: ${assignment.department || 'Chua cap nhat'}</li>
        <li>Han xac nhan: ${expiresText}</li>
      </ul>
      <p><a href="${confirmUrl}" style="padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Xac nhan nhan thiet bi</a></p>
      <p>Neu nut khong bam duoc, vui long mo lien ket: ${confirmUrl}</p>
      <p>ITAM team</p>
    `;

    await sendIssueConfirmEmail({
      to: assignment.employeeEmail,
      subject,
      html,
      attachmentPdfBuffer: pdfAttachment ? pdfAttachment.content : null,
      attachmentName: pdfAttachment ? pdfAttachment.filename : undefined,
    });

    return res.json({ ok: true, expiresAt: confirmMeta.expiresAt });
  } catch (error) {
    console.error('Resend confirm email by token error', error);
    return res.status(500).json({ message: 'Resend confirm email failed' });
  }
};

const cancelAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findByPk(id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.status !== 'PENDING_CONFIRM') {
      return res.status(400).json({ message: 'Chỉ hủy được phiếu đang chờ xác nhận' });
    }

    await assignment.update({ status: 'CANCELLED' });
    return res.json({ ok: true });
  } catch (error) {
    console.error('Cancel assignment error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { confirmAssignment, cancelAssignment, resendConfirmEmail };
