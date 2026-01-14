const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { getAlerts } = require('../services/alertService');
const { getModulesForRole } = require('../services/moduleService');

const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(401).json({ message: 'Sai email hoac mat khau' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ message: 'Sai email hoac mat khau' });

  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
  const alerts = await getAlerts();
  const modules = getModulesForRole(user.role);

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    alerts,
    modules,
  });
};

module.exports = { login };
