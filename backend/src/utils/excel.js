const ExcelJS = require('exceljs');

/**
 * Build an Excel workbook buffer for assignment history.
 */
const exportAssignmentsToExcel = async (assignments, label = 'Report') => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Lich su cap thu');

  sheet.columns = [
  { header: 'Thời gian', key: 'occurredAt', width: 20 },
  { header: 'Hành động', key: 'action', width: 12 },
  { header: 'Nhân viên', key: 'employeeName', width: 25 },
  { header: 'Mã NV', key: 'employeeCode', width: 14 },
  { header: 'Email', key: 'employeeEmail', width: 30 },
  { header: 'Phòng ban', key: 'department', width: 18 },
  { header: 'Thiết bị', key: 'deviceName', width: 25 },
  { header: 'Mã TB', key: 'deviceCode', width: 14 },
  { header: 'Ghi chú', key: 'notes', width: 22 },
  { header: 'Lý do thu hồi', key: 'returnReason', width: 22 },
  { header: 'Thực hiện bởi', key: 'user', width: 22 },
];


  assignments.forEach((item) => {
    const device = item.Device || item.device || {};
    const user = item.User || item.user || {};
    sheet.addRow({
      occurredAt: item.occurredAt,
      action: item.action,
      employeeName: item.employeeName,
      employeeCode: item.employeeCode,
      employeeEmail: item.employeeEmail,
      department: item.department,
      deviceName: device.name || '',
      deviceCode: device.code || '',
      notes: item.notes || '',
      returnReason: item.returnReason || '',
      user: user.name || '',
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return { buffer, filename: `${label}-ITAM.xlsx`, contentType: EXCEL_CONTENT_TYPE };
};

const EXCEL_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Generic helper to export rows to Excel with customizable headers.
 * `headers` can be strings or full ExcelJS column objects.
 */
const exportRowsToExcel = async (rows, headers, opts = {}) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(opts.sheetName || 'Data');

  sheet.columns = headers.map((h) =>
    typeof h === 'string'
      ? { header: h, key: h, width: Math.max(12, String(h).length + 2) }
      : h,
  );

  (rows || []).forEach((row) => sheet.addRow(row));

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer,
    filename: `${opts.filename || 'export'}.xlsx`,
    contentType: EXCEL_CONTENT_TYPE,
  };
};

/**
 * Parse the first worksheet of an Excel buffer into an array of objects using the header row as keys.
 */
const parseExcel = async (buffer, opts = {}) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.getWorksheet(opts.sheetIndex || 1);
  if (!sheet) return [];

  const headerRowIdx = opts.headerRow || 1;
  const headerRow = sheet.getRow(headerRowIdx);
  const headers = headerRow.values.slice(1).map((h) => String(h || '').trim());

  const data = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowIdx) return;
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = row.getCell(idx + 1).value ?? '';
    });
    if (Object.values(record).some((v) => v !== '' && v !== null && v !== undefined)) {
      data.push(record);
    }
  });

  return data;
};

module.exports = { exportAssignmentsToExcel, exportRowsToExcel, parseExcel, EXCEL_CONTENT_TYPE };
