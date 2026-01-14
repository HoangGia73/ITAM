const crypto = require('crypto');
const dayjs = require('dayjs');

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const generateConfirmToken = (expiresInHours = 72) => {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = dayjs().add(expiresInHours, 'hour').toDate();
  return { token, tokenHash, expiresAt };
};

const isExpired = (expiresAt) => {
  if (!expiresAt) return true;
  return dayjs(expiresAt).isBefore(dayjs());
};

const verifyToken = (token, storedHash, expiresAt) => {
  if (!token || !storedHash) return false;
  if (isExpired(expiresAt)) return false;
  return hashToken(token) === storedHash;
};

module.exports = {
  hashToken,
  generateConfirmToken,
  verifyToken,
  isExpired,
};
