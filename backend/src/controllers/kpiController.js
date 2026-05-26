const db = require('../db');

const getByProject = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT k.*, p.name AS project_name FROM project_kpi k
       JOIN projects p ON p.id = k.project_id
        WHERE k.project_id = ? ORDER BY k.snapshot_date ASC`,
      [req.params.projectId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

function effectiveActualCost(task) {
  if (task.actual_cost != null) return parseFloat(task.actual_cost);
  const budget = parseFloat(task.budget);
  if (!budget) return 0;
  switch (task.status) {
    case 'done':        return budget * 1.0;
    case 'in_progress': return budget * 0.5;
    case 'review':      return budget * 0.8;
    default:            return 0;
  }
}

const _computeKpi = (tasks, budgetFromProject) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let bac = 0, pv = 0, ev = 0, ac = 0;
  for (const t of tasks) {
    const b = parseFloat(t.budget) || 0;
    bac += b;
    if (t.due_date && new Date(t.due_date) <= today) pv += b;
    if (t.status === 'done') ev += b;
    ac += effectiveActualCost(t);
  }

  if (bac === 0 && budgetFromProject) bac = parseFloat(budgetFromProject) || 0;

  const spi = pv > 0 ? +(ev / pv).toFixed(4) : null;
  const cpi = ac > 0 ? +(ev / ac).toFixed(4) : null;
  const cv  = ac > 0 ? +(ev - ac).toFixed(2) : null;
  const sv  = pv > 0 ? +(ev - pv).toFixed(2) : null;
  const eac = cpi && bac > 0 ? +(bac / cpi).toFixed(2) : null;
  const etc = eac != null ? +(eac - ac).toFixed(2) : null;
  const vac = eac != null && bac > 0 ? +(bac - eac).toFixed(2) : null;
  const progress = bac > 0 ? +(ev / bac * 100).toFixed(1) : 0;

  return {
    bac: +bac.toFixed(2), pv: +pv.toFixed(2),
    ev:  +ev.toFixed(2),  ac: +ac.toFixed(2),
    spi, cpi, cv, sv, eac, etc, vac, progress,
    snapshot_date: today.toISOString().slice(0, 10),
  };
};

const autoCalculate = async (req, res) => {
  try {
    const { rows: tasks } = await db.query(
      `SELECT status, budget, actual_cost, due_date FROM tasks WHERE project_id = ?`,
      [req.params.projectId]
    );
    const { rows: proj } = await db.query(
      `SELECT budget FROM projects WHERE id = ?`, [req.params.projectId]
    );
    const kpi = _computeKpi(tasks, proj[0]?.budget);
    res.json({ ...kpi, tasks_count: tasks.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const autoSnapshot = async (req, res) => {
  try {
    const { rows: tasks } = await db.query(
      `SELECT status, budget, actual_cost, due_date FROM tasks WHERE project_id = ?`,
      [req.params.projectId]
    );
    const { rows: proj } = await db.query(
      `SELECT budget FROM projects WHERE id = ?`, [req.params.projectId]
    );
    const k = _computeKpi(tasks, proj[0]?.budget);

    const { rows } = await db.query(
      `INSERT INTO project_kpi
         (project_id, snapshot_date, planned_value, earned_value, actual_cost,
          budget_at_completion, spi, cpi, cv, sv, eac, etc, vac)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT (project_id, snapshot_date) DO UPDATE SET
         planned_value = EXCLUDED.planned_value,
         earned_value  = EXCLUDED.earned_value,
         actual_cost   = EXCLUDED.actual_cost,
         budget_at_completion = EXCLUDED.budget_at_completion,
         spi = EXCLUDED.spi, cpi = EXCLUDED.cpi,
         cv  = EXCLUDED.cv,  sv  = EXCLUDED.sv,
         eac = EXCLUDED.eac, etc = EXCLUDED.etc
       RETURNING *`,
      [req.params.projectId, k.snapshot_date,
       k.pv, k.ev, k.ac, k.bac > 0 ? k.bac : null,
       k.spi, k.cpi, k.cv, k.sv, k.eac, k.etc, k.vac]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const addSnapshot = async (req, res) => {
  const { planned_value, earned_value, actual_cost, budget_at_completion, snapshot_date } = req.body;
  if (planned_value === undefined || earned_value === undefined || actual_cost === undefined) {
    return res.status(400).json({ error: 'PV, EV, AC обязательны' });
  }
  const pv = parseFloat(planned_value);
  const ev = parseFloat(earned_value);
  const ac = parseFloat(actual_cost);
  const bac = parseFloat(budget_at_completion) || null;

  const spi = pv !== 0 ? +(ev / pv).toFixed(4) : null;
  const cpi = ac !== 0 ? +(ev / ac).toFixed(4) : null;
  const cv  = ac !== 0 ? +(ev - ac).toFixed(2) : null;
  const sv  = pv !== 0 ? +(ev - pv).toFixed(2) : null;
  const eac = cpi && bac ? +(bac / cpi).toFixed(2) : null;
  const etc = eac ? +(eac - ac).toFixed(2) : null;
  const vac = eac != null && bac != null ? +(parseFloat(bac) - parseFloat(eac)).toFixed(2) : null;

  try {
    const { rows } = await db.query(
      `INSERT INTO project_kpi
         (project_id, snapshot_date, planned_value, earned_value, actual_cost,
          budget_at_completion, spi, cpi, cv, sv, eac, etc, vac)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING *`,
      [req.params.projectId, snapshot_date || new Date().toISOString().slice(0,10),
       pv, ev, ac, bac, spi, cpi, cv, sv, eac, etc, vac]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getProjectSummary = async (req, res) => {
  try {
    const { rows: kpi } = await db.query(
      `SELECT * FROM project_kpi WHERE project_id = ? ORDER BY snapshot_date DESC LIMIT 1`,
      [req.params.projectId]
    );
    const { rows: tasks } = await db.query(
      `SELECT status, COUNT(*) AS cnt, SUM(estimated_hours) AS est_h, SUM(actual_hours) AS act_h
       FROM tasks WHERE project_id = ? GROUP BY status`,
      [req.params.projectId]
    );
    const { rows: load } = await db.query(
      `SELECT u.full_name, u.id,
              SUM(t.estimated_hours) AS planned,
              SUM(t.actual_hours) AS actual,
              COUNT(t.id) AS task_count
       FROM tasks t JOIN users u ON u.id = t.assignee_id
       WHERE t.project_id = ? AND t.assignee_id IS NOT NULL
       GROUP BY u.id, u.full_name ORDER BY actual DESC NULLS LAST`,
      [req.params.projectId]
    );
    res.json({ latest_kpi: kpi[0] || null, task_stats: tasks, resource_stats: load });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const { rows: projects } = await db.query(
      `SELECT status, COUNT(*) AS cnt FROM projects GROUP BY status`
    );
    const { rows: tasks } = await db.query(
      `SELECT status, COUNT(*) AS cnt FROM tasks GROUP BY status`
    );
    const { rows: overdue } = await db.query(
      `SELECT COUNT(*) AS cnt FROM tasks
       WHERE due_date < datetime('now') AND status NOT IN ('done','cancelled')`
    );
    const { rows: recentProjects } = await db.query(
      `SELECT p.id, p.name, p.status, p.priority, p.end_date,
              COUNT(t.id) AS total_tasks,
              COUNT(CASE WHEN t.status='done' THEN 1 END) AS done_tasks
       FROM projects p LEFT JOIN tasks t ON t.project_id = p.id
       WHERE p.status = 'active'
       GROUP BY p.id ORDER BY p.created_at DESC LIMIT 5`
    );
    res.json({
      project_stats: projects,
      task_stats: tasks,
      overdue_tasks: parseInt(overdue[0]?.cnt || 0),
      recent_active_projects: recentProjects
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getByProject, addSnapshot, autoCalculate, autoSnapshot, getProjectSummary, getDashboardStats };
