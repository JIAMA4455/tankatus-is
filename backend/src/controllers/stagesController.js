const db = require('../db');

const getByProject = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM stages WHERE project_id = ? ORDER BY order_index ASC`,
      [req.params.projectId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const create = async (req, res) => {
  const { project_id, name, description, order_index, start_date, end_date } = req.body;
  if (!project_id || !name) return res.status(400).json({ error: 'project_id и name обязательны' });
  try {
    const { rows } = await db.query(
      `INSERT INTO stages (project_id, name, description, order_index, start_date, end_date)
       VALUES (?,?,?,?,?,?) RETURNING *`,
      [project_id, name, description, order_index || 0, start_date, end_date]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const update = async (req, res) => {
  const fields = ['name','description','status','order_index','start_date','end_date'];
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
      `UPDATE stages SET ${updates.join(',')} WHERE id = ? RETURNING *`, vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Этап не найден' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM stages WHERE id = ?', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Этап не найден' });
    res.json({ message: 'Этап удалён' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getByProject, create, update, remove };
