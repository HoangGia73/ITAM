const bcrypt = require('bcryptjs');
const { User } = require('../models');

const listUsers = async (_req, res) => {
  const users = await User.findAll({ order: [['id', 'ASC']] });
  res.json(users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, active: u.active })));
};

const createUser = async (req, res) => {
  const { name, email, role = 'IT_STAFF', password } = req.body;
  const passwordHash = await bcrypt.hash(password || 'changeme123', 10);
  const user = await User.create({ name, email, role, passwordHash });
  res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const user = await User.findByPk(id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const updates = { name: req.body.name, role: req.body.role, active: req.body.active };
  if (req.body.password) updates.passwordHash = await bcrypt.hash(req.body.password, 10);

  await user.update(updates);
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, active: user.active });
};

module.exports = { listUsers, createUser, updateUser };
