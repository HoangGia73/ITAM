const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const sendMail = async ({ to, subject, html, attachments = [] }) => {
  const from = process.env.MAIL_FROM || process.env.MAIL_USER;
  await transporter.sendMail({
    from,
    to,
    subject,
    html,
    attachments: attachments.length ? attachments : undefined,
  });
};

const sendIssueConfirmEmail = async ({ to, subject, html, attachmentPdfBuffer, attachmentName = 'assignment.pdf' }) => {
  const attachments = attachmentPdfBuffer
    ? [
        {
          filename: attachmentName,
          content: attachmentPdfBuffer,
        },
      ]
    : [];
  await sendMail({ to, subject, html, attachments });
};

module.exports = { sendMail, sendIssueConfirmEmail };
