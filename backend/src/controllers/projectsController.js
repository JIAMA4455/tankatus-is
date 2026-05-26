const db = require('../db');

const getAll = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*, u.full_name AS manager_name,
              COUNT(DISTINCT t.id) AS total_tasks,
              COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) AS done_tasks
       FROM projects p
       LEFT JOIN users u ON p.manager_id = u.id
       LEFT JOIN tasks t ON t.project_id = p.id
  ${req.user.role === 'admin' || req.user.role === 'manager' ? '' :
     'INNER JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?'}
   GROUP BY p.id, u.full_name
   ORDER BY p.created_at DESC`,
  req.user.role === 'admin' || req.user.role === 'manager' ? [] : [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getOne = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*, u.full_name AS manager_name FROM projects p
       LEFT JOIN users u ON p.manager_id = u.id
        WHERE p.id = ?`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Проект не найден' });

    const { rows: members } = await db.query(
      `SELECT u.id, u.full_name, u.email, u.role, u.department, pm.role AS project_role
       FROM project_members pm JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = ?`,
      [req.params.id]
    );
    res.json({ ...rows[0], members });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const create = async (req, res) => {
  const { name, description, status, priority, start_date, end_date, budget, manager_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Название проекта обязательно' });
  try {
    const { rows } = await db.query(
      `INSERT INTO projects (name, description, status, priority, start_date, end_date, budget, manager_id)
       VALUES (?,?,?,?,?,?,?,?) RETURNING *`,
      [name, description, status || 'planning', priority || 'medium', start_date, end_date, budget,
       manager_id || req.user.id]
    );
    await db.query(
      `INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES (?,?,'manager')`,
      [rows[0].id, manager_id || req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const update = async (req, res) => {
  const fields = ['name','description','status','priority','start_date','end_date','budget','manager_id'];
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
      `UPDATE projects SET ${updates.join(',')} WHERE id = ? RETURNING *`,
      vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Проект не найден' });
    global.io?.to(`project:${rows[0].id}`).emit('project:updated', rows[0]);
    global.io?.emit('projects:changed');
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM projects WHERE id = ?', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Проект не найден' });
    global.io?.emit('project:deleted', { id: req.params.id });
    global.io?.emit('projects:changed');
    res.json({ message: 'Проект удалён' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const addMember = async (req, res) => {
  const { user_id, role = 'member' } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id обязателен' });
  try {
    await db.query(
      `INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES (?,?,?)`,
      [req.params.id, user_id, role]
    );
    res.json({ message: 'Участник добавлен' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const removeMember = async (req, res) => {
  try {
    await db.query('DELETE FROM project_members WHERE project_id=? AND user_id=?',
      [req.params.id, req.params.userId]);
    res.json({ message: 'Участник удалён' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAll, getOne, create, update, remove, addMember, removeMember };
