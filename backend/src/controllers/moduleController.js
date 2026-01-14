const { getModulesForRole } = require('../services/moduleService');

const listModules = (req, res) => {
  const modules = getModulesForRole(req.user.role);
  res.json({ modules });
};

module.exports = { listModules };
