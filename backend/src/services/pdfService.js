const path = require('path');
const os = require('os');
const fs = require('fs').promises;
const Handlebars = require('handlebars');
const puppeteer = require('puppeteer');
const dayjs = require('dayjs');

const templatesDir = path.join(__dirname, '../templates');

// Basic helper for formatting dates in templates
Handlebars.registerHelper('formatDate', (value, format = 'DD/MM/YYYY') => {
  if (!value) return '';
  return dayjs(value).format(format);
});

const buildFileName = (action, device, occurredAt) => {
  const slug = `${action || 'document'}_${device?.code || device?.name || 'device'}_${dayjs(
    occurredAt || new Date(),
  ).format('YYYYMMDDHHmmss')}`;
  return `${slug.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
};

const renderTemplate = async (name, data) => {
  const templatePath = path.join(templatesDir, `${name}.hbs`);
  const templateSource = await fs.readFile(templatePath, 'utf8');
  const template = Handlebars.compile(templateSource);
  return template(data);
};

/**
 * Generate assignment document (issue/return) using Handlebars + Puppeteer.
 * @param {Object} params
 * @param {Object} params.assignment
 * @param {Object} params.device
 * @param {Object} params.employee { name, email, department, code }
 * @param {'issue'|'return'} params.action
 * @returns {Promise<{buffer: Buffer, fileName: string}>}
 */
const generateAssignmentDocument = async ({ assignment, device, employee, action }) => {
  const templateName = action === 'return' ? 'return' : 'issue';
  const generatedAt = new Date();
  const handledBy = process.env.HANDOVER_NAME || 'Bộ phận IT';

  const html = await renderTemplate(templateName, {
    companyName: process.env.COMPANY_NAME || 'ITAM',
    documentTitle: action === 'return' ? 'Biên bản thu hồi thiết bị' : 'Biên bản bàn giao thiết bị',
    assignment,
    device,
    employee,
    handledBy,
    generatedAt,
    issuedAtText: dayjs(assignment?.occurredAt || generatedAt).format('DD/MM/YYYY HH:mm'),
  });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    userDataDir: path.join(os.tmpdir(), `puppeteer-profile-${Date.now()}`),
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    });

    const fileName = buildFileName(action, device, assignment?.occurredAt || generatedAt);
    return { buffer, fileName };
  } finally {
    // Ignore cleanup errors (e.g., EBUSY on Windows temp files)
    try {
      await browser.close();
    } catch (err) {
      console.warn('Puppeteer close warning (ignored):', err?.message || err);
    }
  }
};

module.exports = { generateAssignmentDocument };
