const db = require('../db');

const getAll = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, email, full_name, role, department, is_active, created_at
       FROM users ORDER BY full_name`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const update = async (req, res) => {
  const fields = ['full_name','role','department','is_active'];
  const updates = [];
  const vals = [];
  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      vals.push(req.body[f]);
    }
  });
  if (!updates.length) return res.status(400).json({ error: 'Нет данных для обновления' });
  vals.push(req.params.id);
  try {
    const { rows } = await db.query(
      `UPDATE users SET ${updates.join(',')} WHERE id = ?
       RETURNING id, email, full_name, role, department, is_active`,
      vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getLoad = async (req, res) => {
  const { start_date, end_date } = req.query;
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.full_name, u.department,
              SUM(rl.planned_hours) AS total_planned,
              SUM(rl.actual_hours) AS total_actual,
              COUNT(DISTINCT t.id) AS active_tasks
       FROM users u
       LEFT JOIN resource_load rl ON rl.user_id = u.id
          ${start_date ? 'AND rl.date >= ?' : ''}
          ${end_date ? 'AND rl.date <= ?' : ''}
        LEFT JOIN tasks t ON t.assignee_id = u.id AND t.status NOT IN ('done','cancelled')
        WHERE u.is_active = 1
       GROUP BY u.id ORDER BY total_actual DESC NULLS LAST`,
      [start_date, end_date].filter(Boolean)
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAll, update, getLoad };
