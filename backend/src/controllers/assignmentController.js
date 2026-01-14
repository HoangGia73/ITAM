const path = require('path');
const fs = require('fs').promises;
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const dayjs = require('dayjs');
const { Device, Assignment, User, sequelize } = require('../models');
const { sendMail, sendIssueConfirmEmail } = require('../utils/mailer');
const { exportAssignmentsToExcel } = require('../utils/excel');
const { generateAssignmentDocument } = require('../services/pdfService');
const { generateConfirmToken } = require('../utils/assignmentToken');

const getLikeOperator = () => (sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like);

const buildAssignmentWhere = (query) => {
  const { start, end, date, action, search } = query;
  const where = {};
  const like = getLikeOperator();

  if (date) {
    const from = dayjs(date).startOf('day').toDate();
    const to = dayjs(date).endOf('day').toDate();
    where.occurredAt = { [Op.between]: [from, to] };
  } else if (start || end) {
    if (start && end) {
      where.occurredAt = { [Op.between]: [new Date(start), new Date(end)] };
    } else if (start) {
      where.occurredAt = { [Op.gte]: new Date(start) };
    } else if (end) {
      where.occurredAt = { [Op.lte]: new Date(end) };
    }
  }

  if (action) {
    where.action = action;
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    where[Op.or] = [
      { employeeName: { [like]: term } },
      { employeeCode: { [like]: term } },
      { department: { [like]: term } },
      { notes: { [like]: term } },
      { '$device.name$': { [like]: term } },
      { '$device.code$': { [like]: term } },
      { '$user.name$': { [like]: term } },
    ];
  }

  return where;
};

const createAssignment = async (req, res) => {
  const { deviceId, action, employeeName, employeeCode, employeeEmail, department, notes } = req.body;
  const device = await Device.findByPk(deviceId);
  if (!device) return res.status(404).json({ message: 'Device not found' });

  if (action === 'issue') {
    if (device.status !== 'available') {
      return res.status(400).json({ message: 'Thiết bị không ở trạng thái trống' });
    }
    if (device.lifecycleStatus && device.lifecycleStatus !== 'normal') {
      return res.status(400).json({ message: 'Thiết bị không ở vòng đời bình thường, không thể cấp' });
    }

    const warrantyEnd = device.warrantyEndDate ? dayjs(device.warrantyEndDate) : null;
    const warrantyExpired = warrantyEnd ? warrantyEnd.isBefore(dayjs(), 'day') : false;
    const maintenanceDue = device.maintenanceDue;
    if (warrantyExpired || maintenanceDue) {
      return res.status(400).json({ message: 'Thiết bị quá hạn bảo hành/bảo trì, không thể cấp' });
    }
  }

  if (action === 'return' && device.status !== 'assigned') {
    return res.status(400).json({ message: 'Thiết bị không ở trạng thái đã cấp' });
  }

  if (action === 'return') {
    await device.update({ status: 'available' });
  }

  const confirmMeta = action === 'issue' ? generateConfirmToken(0.5) : null;
  const assignment = await Assignment.create({
    device_id: deviceId,
    user_id: req.user.id,
    action,
    employeeName,
    employeeCode,
    employeeEmail,
    department,
    notes,
    returnReason: action === 'return' ? req.body.returnReason || null : null,
    status: action === 'issue' ? 'PENDING_CONFIRM' : 'RETURNED',
    confirmToken: confirmMeta ? confirmMeta.tokenHash : null,
    confirmTokenExpiresAt: confirmMeta ? confirmMeta.expiresAt : null,
  });

  const deviceData = device.get({ plain: true });
  const assignmentData = assignment.get({ plain: true });
  let pdfAttachment = null;

  try {
    const { buffer, fileName } = await generateAssignmentDocument({
      assignment: assignmentData,
      device: deviceData,
      employee: {
        name: employeeName,
        code: employeeCode,
        email: employeeEmail,
        department,
      },
      action,
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

    assignmentData.documentUrl = documentUrl;
    assignmentData.documentName = fileName;
    assignmentData.documentGeneratedAt = documentGeneratedAt;
    pdfAttachment = { filename: fileName, content: buffer };
  } catch (error) {
    console.error('Generate assignment PDF error', error);
  }

  if (action === 'issue') {
    const confirmBase =
      process.env.FRONTEND_CONFIRM_URL ||
      process.env.FRONTEND_URL ||
      'http://localhost:3000/confirm-assignment';
    const confirmUrl = `${confirmBase.replace(/\/$/, '')}?token=${confirmMeta.token}`;
    const subject = `Yêu cầu xác nhận nhận tài sản - ${device.code}`;
    const expiresText = dayjs(confirmMeta.expiresAt).format('DD/MM/YYYY HH:mm');
    const html = `
      <p>Chào ${employeeName},</p>
      <p>Bạn có một yêu cầu nhận tài sản cần xác nhận.</p>
      <ul>
        <li>Thiết bị: <b>${device.name}</b> (${device.code})</li>
        <li>Phòng ban: ${department || 'Chưa cập nhật'}</li>
        <li>Hạn xác nhận: ${expiresText}</li>
      </ul>
      <p><a href="${confirmUrl}" style="padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Xác nhận nhận thiết bị</a></p>
      <p>Nếu nút không bấm được, vui lòng mở liên kết: ${confirmUrl}</p>
      <p>ITAM team</p>
    `;

    try {
      await sendIssueConfirmEmail({
        to: employeeEmail,
        subject,
        html,
        attachmentPdfBuffer: pdfAttachment ? pdfAttachment.content : null,
        attachmentName: pdfAttachment ? pdfAttachment.filename : undefined,
      });
    } catch (error) {
      console.error('Send confirm mail error', error);
    }
  } else {
    const actionLabel = 'Thu hồi thiết bị';
    const nextStep = 'Vui lòng bàn giao lại thiết bị cho IT và xác nhận khi hoàn tất.';

    try {
      await sendMail({
        to: employeeEmail,
        subject: `Thông báo ${actionLabel} - ${device.name}`,
        html: `
          <p>Chào ${employeeName},</p>
          <p>Đây là thông báo ${actionLabel.toLowerCase()}:</p>
          <ul>
            <li>Thiết bị: <b>${device.name}</b> (${device.code})</li>
            <li>Thao tác: <b>${actionLabel}</b></li>
            <li>Phòng ban: ${department || 'Chưa cập nhật'}</li>
            <li>Ghi chú: ${notes || 'Không có'}</li>
          </ul>
          <p>${nextStep}</p>
          <p>ITAM team</p>
        `,
        attachments: pdfAttachment ? [pdfAttachment] : [],
      });
    } catch (error) {
      console.error('Send mail error', error);
    }
  }

  res.status(201).json(assignment);
};

const resendIssueEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findByPk(id, { include: [{ model: Device }] });
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.action !== 'issue') {
      return res.status(400).json({ message: 'Chỉ gửi lại email cho phiếu cấp phát' });
    }

    if (assignment.status !== 'PENDING_CONFIRM') {
      return res.status(400).json({ message: 'Chỉ gửi lại khi phiếu đang chờ xác nhận' });
    }

    const deviceId = assignment.device_id || assignment.deviceId;
    const device = assignment.Device || (deviceId ? await Device.findByPk(deviceId) : null);
    if (!device) {
      return res.status(404).json({ message: 'Thiết bị không tồn tại' });
    }

    const confirmMeta = generateConfirmToken(0.5);
    const confirmBase =
      process.env.FRONTEND_CONFIRM_URL ||
      process.env.FRONTEND_URL ||
      'http://localhost:3000/confirm-assignment';
    const confirmUrl = `${confirmBase.replace(/\/$/, '')}?token=${confirmMeta.token}`;
    const subject = `Yêu cầu xác nhận nhận tài sản - ${device.code}`;
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
      console.error('Generate assignment PDF (resend) error', error);
    }

    try {
      await assignment.update({
        confirmToken: confirmMeta.tokenHash,
        confirmTokenExpiresAt: confirmMeta.expiresAt,
      });

      const html = `
        <p>Chào ${assignment.employeeName},</p>
        <p>Bạn có một yêu cầu nhận tài sản cần xác nhận.</p>
        <ul>
          <li>Thiết bị: <b>${device.name}</b> (${device.code})</li>
          <li>Phòng ban: ${assignment.department || 'Chưa cập nhật'}</li>
          <li>Hạn xác nhận: ${expiresText}</li>
        </ul>
        <p><a href="${confirmUrl}" style="padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Xác nhận nhận thiết bị</a></p>
        <p>Nếu nút không bấm được, vui lòng mở liên kết: ${confirmUrl}</p>
        <p>ITAM team</p>
      `;

      await sendIssueConfirmEmail({
        to: assignment.employeeEmail,
        subject,
        html,
        attachmentPdfBuffer: pdfAttachment ? pdfAttachment.content : null,
        attachmentName: pdfAttachment ? pdfAttachment.filename : undefined,
      });
    } catch (error) {
      console.error('Resend confirm mail error', error);
      return res.status(500).json({ message: 'Gửi lại email thất bại' });
    }

    return res.json({ ok: true, expiresAt: confirmMeta.expiresAt });
  } catch (error) {
    console.error('Resend assignment email error', error);
    return res.status(500).json({ message: 'Gửi lại email thất bại' });
  }
};

const listAssignments = async (req, res) => {
  try {
    const where = buildAssignmentWhere(req.query);
    const assignments = await Assignment.findAll({
      where,
      include: [
        { model: Device, required: false },
        { model: User, attributes: ['id', 'name', 'email', 'role'], required: false },
      ],
      order: [['occurredAt', 'DESC']],
    });
    res.json(assignments);
  } catch (error) {
    console.error('List assignments error', error);
    res.status(500).json({ message: 'Không tải được lịch sử', detail: error.message });
  }
};

const exportAssignments = async (req, res) => {
  try {
    const { start, end, action, date } = req.query;
    const where = buildAssignmentWhere(req.query);
    const assignments = await Assignment.findAll({
      where,
      include: [
        { model: Device, required: false },
        { model: User, attributes: ['name', 'email'], required: false },
      ],
      order: [['occurredAt', 'DESC']],
    });

    const nameSuffix = [
      date || `${start || 'all'}-${end || 'all'}`,
      action || null,
    ]
      .filter(Boolean)
      .join('-');

    const { buffer, filename } = await exportAssignmentsToExcel(assignments, `assignments-${nameSuffix || 'all'}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Export assignments error', error);
    res.status(500).json({ message: 'Xuất Excel thất bại', detail: error.message });
  }
};

const listActiveAssignees = async (req, res) => {
  const { employeeCode, employeeEmail } = req.query;

  const where = { status: 'CONFIRMED' };
  if (employeeCode) where.employeeCode = employeeCode;
  if (employeeEmail) where.employeeEmail = employeeEmail;

  const assignments = await Assignment.findAll({
    where,
    include: [{ model: Device, where: { status: 'assigned' } }],
    order: [['occurredAt', 'DESC']],
  });

  const latestByDevice = new Map();
  assignments.forEach((assignment) => {
    const deviceObj = assignment.Device || assignment.device;
    const deviceId = assignment.device_id || deviceObj?.id;
    if (!deviceId) return;
    if (!latestByDevice.has(deviceId)) {
      latestByDevice.set(deviceId, assignment);
    }
  });

  const employees = new Map();
  latestByDevice.forEach((assignment) => {
    const key = `${assignment.employeeCode}|${assignment.employeeEmail}`;
    if (!employees.has(key)) {
      employees.set(key, {
        employeeName: assignment.employeeName,
        employeeCode: assignment.employeeCode,
        employeeEmail: assignment.employeeEmail,
        department: assignment.department,
        devices: [],
      });
    }

    const deviceObj = assignment.Device || assignment.device;
    if (deviceObj) {
      employees.get(key).devices.push({
        id: deviceObj.id,
        name: deviceObj.name,
        code: deviceObj.code,
        status: deviceObj.status,
      });
    }
  });

  res.json(Array.from(employees.values()));
};

const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || !password.trim()) {
      return res.status(400).json({ message: 'Mat khau admin bat buoc' });
    }

    const admin = await User.findByPk(req.user.id);
    if (!admin || admin.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const validPassword = await bcrypt.compare(password, admin.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Mat khau admin khong dung' });
    }

    const assignment = await Assignment.findByPk(id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    await assignment.destroy();
    return res.json({ ok: true });
  } catch (error) {
    console.error('Delete assignment error', error);
    return res.status(500).json({ message: 'Xoa lich su that bai' });
  }
};

module.exports = {
  createAssignment,
  listAssignments,
  listActiveAssignees,
  exportAssignments,
  deleteAssignment,
  resendIssueEmail,
};
