const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  }
  try {
    const { rows } = await db.query(
      'SELECT * FROM users WHERE email = ? AND is_active = 1',
      [email.toLowerCase()]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Неверные данные' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Неверные данные' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    const { password: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Только admin может создавать пользователей
const createUser = async (req, res) => {
  const { email, password, full_name, role = 'worker', department } = req.body;
  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Email, пароль и имя обязательны' });
  }
  const allowedRoles = ['admin', 'manager', 'worker', 'viewer'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: `Роль должна быть одной из: ${allowedRoles.join(', ')}` });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      `INSERT INTO users (email, password, full_name, role, department)
       VALUES (?, ?, ?, ?, ?) RETURNING id, email, full_name, role, department, created_at`,
      [email.toLowerCase(), hash, full_name, role, department]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email уже занят' });
    res.status(500).json({ error: err.message });
  }
};

const me = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, email, full_name, role, department, avatar_url, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { login, createUser, me };
