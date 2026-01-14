const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Missing token' });

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(payload.id);
    if (!user || !user.active) return res.status(401).json({ message: 'Invalid user' });
    req.user = { id: user.id, role: user.role, name: user.name, email: user.email };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

const requireRole = (roles = []) => (req, res, next) => {
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
  next();
};

module.exports = { authenticate, requireRole };
