const db = require('../db');

const getByProject = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT t.*,
              u.full_name AS assignee_name, u.email AS assignee_email,
              c.full_name AS creator_name,
              s.name AS stage_name
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       LEFT JOIN users c ON t.creator_id = c.id
       LEFT JOIN stages s ON t.stage_id = s.id
        WHERE t.project_id = ?
        ORDER BY t.created_at DESC`,
      [req.params.projectId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getOne = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT t.*,
              u.full_name AS assignee_name,
              c.full_name AS creator_name,
              s.name AS stage_name
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       LEFT JOIN users c ON t.creator_id = c.id
       LEFT JOIN stages s ON t.stage_id = s.id
        WHERE t.id = ?`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Задача не найдена' });

    const { rows: comments } = await db.query(
      `SELECT cm.*, u.full_name AS author_name, u.avatar_url
       FROM comments cm JOIN users u ON u.id = cm.author_id
       WHERE cm.task_id = ? ORDER BY cm.created_at ASC`,
      [req.params.id]
    );
    const { rows: attachments } = await db.query(
      'SELECT * FROM attachments WHERE task_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json({ ...rows[0], comments, attachments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getMyTasks = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT t.*,
              p.name AS project_name,
              s.name AS stage_name
       FROM tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN stages s ON t.stage_id = s.id
        WHERE t.assignee_id = ? AND t.status != 'done' AND t.status != 'cancelled'
        ORDER BY t.due_date ASC NULLS LAST, t.priority DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const create = async (req, res) => {
  const { project_id, stage_id, parent_task_id, title, description,
          status, priority, assignee_id, estimated_hours, start_date, due_date } = req.body;
  if (!project_id || !title) return res.status(400).json({ error: 'project_id и title обязательны' });
  try {
    const { rows } = await db.query(
      `INSERT INTO tasks (project_id, stage_id, parent_task_id, title, description,
                           status, priority, assignee_id, creator_id, estimated_hours, start_date, due_date)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?) RETURNING *`,
      [project_id, stage_id, parent_task_id, title, description,
       status || 'todo', priority || 'medium', assignee_id, req.user.id,
       estimated_hours, start_date, due_date]
    );
    const task = rows[0];
    global.io?.to(`project:${task.project_id}`).emit('task:created', task);
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const update = async (req, res) => {
  const role = req.user.role;

  if (role === 'viewer') return res.status(403).json({ error: 'Недостаточно прав' });

  if (role === 'worker') {
    const { rows: check } = await db.query(
      'SELECT assignee_id FROM tasks WHERE id = ?', [req.params.id]
    );
    if (!check[0]) return res.status(404).json({ error: 'Задача не найдена' });
    if (check[0].assignee_id !== req.user.id)
      return res.status(403).json({ error: 'Вы можете редактировать только назначенные вам задачи' });

    const allowed = ['status', 'actual_hours'];
    const updates = [];
    const vals = [];
    allowed.forEach(f => {
      if (req.body[f] !== undefined) { updates.push(`${f} = ?`); vals.push(req.body[f]); }
    });
    if (req.body.status === 'done') { updates.push('completed_at = ?'); vals.push(new Date().toISOString()); }
    if (!updates.length) return res.status(400).json({ error: 'Нет данных для обновления' });
    vals.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE tasks SET ${updates.join(',')} WHERE id = ? RETURNING *`, vals
    );
    const task = rows[0];
    global.io?.to(`project:${task.project_id}`).emit('task:updated', task);
    return res.json(task);
  }

  // Admin / Manager
  const fields = ['title','description','status','priority','assignee_id',
                  'stage_id','estimated_hours','actual_hours','start_date','due_date','parent_task_id'];
  const updates = [];
  const vals = [];
  fields.forEach(f => {
    if (req.body[f] !== undefined) { updates.push(`${f} = ?`); vals.push(req.body[f]); }
  });
  if (req.body.status === 'done') { updates.push('completed_at = ?'); vals.push(new Date().toISOString()); }
  if (!updates.length) return res.status(400).json({ error: 'Нет данных для обновления' });
  vals.push(req.params.id);
  try {
    const { rows } = await db.query(
      `UPDATE tasks SET ${updates.join(',')} WHERE id = ? RETURNING *`, vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Задача не найдена' });
    const task = rows[0];
    global.io?.to(`project:${task.project_id}`).emit('task:updated', task);
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const { rows: found } = await db.query(
      'SELECT project_id FROM tasks WHERE id = ?', [req.params.id]
    );
    if (!found[0]) return res.status(404).json({ error: 'Задача не найдена' });
    const { project_id } = found[0];
    await db.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    global.io?.to(`project:${project_id}`).emit('task:deleted', { id: req.params.id, project_id });
    res.json({ message: 'Задача удалена' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getByProject, getOne, getMyTasks, create, update, remove };
