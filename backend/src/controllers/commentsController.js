const db = require('../db');

const addComment = async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Текст комментария обязателен' });
  try {
    const { rows } = await db.query(
      `INSERT INTO comments (task_id, author_id, content) VALUES (?,?,?) RETURNING *`,
      [req.params.taskId, req.user.id, content]
    );
    const { rows: full } = await db.query(
      `SELECT cm.*, u.full_name AS author_name, u.avatar_url
        FROM comments cm JOIN users u ON u.id = cm.author_id WHERE cm.id = ?`,
      [rows[0].id]
    );
    res.status(201).json(full[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteComment = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT author_id FROM comments WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Комментарий не найден' });
    if (rows[0].author_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Нет прав для удаления' });
    }
    await db.query('DELETE FROM comments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Комментарий удалён' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { addComment, deleteComment };
