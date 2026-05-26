import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '@/services/api';
import type { Project, Task, Stage } from '@/types';
import { StatusBadge, PriorityBadge } from '@/components/ui/Badges';
import { useAuthStore } from '@/store/authStore';
import GanttChart from '@/components/projects/GanttChart';
import { useProjectSocket } from '@/hooks/useSocket';

const PRIORITY_OPTS = ['low','medium','high','critical'];
const STATUS_OPTS   = ['todo','in_progress','review','done'];
const STATUS_LABELS: Record<string,string> = {
  todo:'К выполнению', in_progress:'В работе', review:'На ревью', done:'Готово'
};
const PRIORITY_LABELS: Record<string,string> = {
  low:'Низкий', medium:'Средний', high:'Высокий', critical:'Критический'
};

// ─── Helpers ────────────────────────────────────────────────────────────────

interface FlatNode {
  task: Task;
  depth: number;
  wbs: string;
  hasChildren: boolean;
}

function buildWBSTree(tasks: Task[]): FlatNode[] {
  const map = new Map(tasks.map(t => [t.id, { ...t, children: [] as Task[] }]));
  const roots: Task[] = [];
  map.forEach(t => {
    if (t.parent_task_id && map.has(t.parent_task_id)) {
      map.get(t.parent_task_id)!.children.push(t);
    } else {
      roots.push(t);
    }
  });

  const result: FlatNode[] = [];
  function walk(nodes: Task[], depth: number, prefix: string) {
    nodes.forEach((t, i) => {
      const wbs = prefix ? `${prefix}.${i + 1}` : `${i + 1}`;
      const node = map.get(t.id)!;
      result.push({ task: t, depth, wbs, hasChildren: node.children.length > 0 });
      walk(node.children, depth + 1, wbs);
    });
  }
  walk(roots, 0, '');
  return result;
}

// ─── Task Form Modal (create + edit) ────────────────────────────────────────

type ModalMode = { type: 'create'; parentId?: string } | { type: 'edit'; task: Task } | null;

function TaskFormModal({
  mode, projectId, stages, users, onSave, onClose
}: {
  mode: ModalMode; projectId: string; stages: Stage[]; users: any[];
  onSave: () => void; onClose: () => void;
}) {
  const isEdit = mode?.type === 'edit';
  const editTask = isEdit ? mode.task : null;

  const [form, setForm] = useState({
    title:           editTask?.title           ?? '',
    description:     editTask?.description     ?? '',
    priority:        editTask?.priority        ?? 'medium',
    status:          editTask?.status          ?? 'todo',
    stage_id:        editTask?.stage_id        ?? '',
    assignee_id:     editTask?.assignee_id     ?? '',
    budget:          editTask?.budget          ? String(editTask.budget) : '',
    actual_cost:     editTask?.actual_cost     ? String(editTask.actual_cost) : '',
    estimated_hours: editTask?.estimated_hours ? String(editTask.estimated_hours) : '',
    actual_hours:    editTask?.actual_hours    ? String(editTask.actual_hours)    : '',
    start_date:      editTask?.start_date      ?? '',
    due_date:        editTask?.due_date        ?? '',
    parent_task_id:  isEdit ? (editTask?.parent_task_id ?? '') : (mode?.parentId ?? ''),
  });
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        budget:          form.budget          ? parseFloat(form.budget)          : undefined,
        actual_cost:     form.actual_cost     ? parseFloat(form.actual_cost)     : undefined,
        estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : undefined,
        actual_hours:    form.actual_hours    ? parseFloat(form.actual_hours)    : undefined,
        stage_id:        form.stage_id        || undefined,
        assignee_id:     form.assignee_id     || undefined,
        start_date:      form.start_date      || undefined,
        due_date:        form.due_date        || undefined,
        parent_task_id:  form.parent_task_id  || undefined,
      };
      if (isEdit) {
        await api.put(`/tasks/${editTask!.id}`, payload);
      } else {
        await api.post('/tasks', { ...payload, project_id: projectId });
      }
      onSave();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {isEdit ? 'Редактировать задачу' : mode?.parentId ? 'Новая подзадача' : 'Новая задача'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input className="input" placeholder="Название *" required value={form.title}
            onChange={e => set('title', e.target.value)} />
          <textarea className="input" rows={2} placeholder="Описание"
            value={form.description} onChange={e => set('description', e.target.value)} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Приоритет</label>
              <select className="input" value={form.priority} onChange={e => set('priority', e.target.value)}>
                {PRIORITY_OPTS.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Статус</label>
              <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUS_OPTS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Этап</label>
              <select className="input" value={form.stage_id} onChange={e => set('stage_id', e.target.value)}>
                <option value="">Без этапа</option>
                {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Исполнитель</label>
              <select className="input" value={form.assignee_id} onChange={e => set('assignee_id', e.target.value)}>
                <option value="">Не назначен</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Дата начала</label>
              <input className="input" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Срок выполнения</label>
              <input className="input" type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Бюджет задачи (BYN)</label>
              <input className="input" type="number" min="0" step="0.01" value={form.budget}
                onChange={e => set('budget', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Факт. затраты (BYN)</label>
              <input className="input" type="number" min="0" step="0.01" value={form.actual_cost}
                onChange={e => set('actual_cost', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Плановые часы</label>
              <input className="input" type="number" min="0" step="0.5" value={form.estimated_hours}
                onChange={e => set('estimated_hours', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Фактические часы</label>
              <input className="input" type="number" min="0" step="0.5" value={form.actual_hours}
                onChange={e => set('actual_hours', e.target.value)} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm ──────────────────────────────────────────────────────────

function DeleteConfirm({ task, onConfirm, onCancel }: {
  task: Task; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-lg">✕</div>
          <div>
            <p className="font-semibold text-gray-900">Удалить задачу?</p>
            <p className="text-sm text-gray-500 mt-0.5">«{task.title}»</p>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Это действие нельзя отменить. Все подзадачи будут отвязаны.
        </p>
        <div className="flex gap-3">
          <button className="btn-secondary flex-1" onClick={onCancel}>Отмена</button>
          <button className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
            onClick={onConfirm}>
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Kanban Task Card ────────────────────────────────────────────────────────

function TaskCard({ task, canManage, onUpdate, onEdit, onDelete }: {
  task: Task; canManage: boolean;
  onUpdate: () => void; onEdit: (t: Task) => void; onDelete: (t: Task) => void;
}) {
  const user = useAuthStore((s) => s.user);
  const canEdit = canManage || (user?.role === 'worker' && task.assignee_id === user.id);
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

  const changeStatus = async (status: string) => {
    try { await api.put(`/tasks/${task.id}`, { status }); onUpdate(); }
    catch (e) { console.error(e); }
  };

  return (
    <div className="p-4 border border-gray-100 rounded-lg hover:border-primary-200 transition-colors bg-white group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-gray-900 line-clamp-2">{task.title}</p>
        <div className="flex items-center gap-1 flex-shrink-0">
          <PriorityBadge priority={task.priority} />
          {canEdit && (
            <div className="hidden group-hover:flex items-center gap-1">
              <button onClick={() => onEdit(task)}
                className="p-1 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                title="Редактировать">
                ✎
              </button>
              {canManage && (
                <button onClick={() => onDelete(task)}
                  className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Удалить">
                  ✕
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {task.assignee_name && (
        <p className="text-xs text-gray-500 mb-2">Исполнитель: {task.assignee_name}</p>
      )}
      {task.due_date && (
        <p className={`text-xs mb-2 ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
          Срок: {new Date(task.due_date).toLocaleDateString('ru')}
        </p>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge status={task.status} />
        {canEdit && task.status !== 'done' && (
          <select className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white"
            value={task.status} onChange={e => changeStatus(e.target.value)}>
            {STATUS_OPTS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        )}
      </div>
    </div>
  );
}

// ─── WBS Tree View ───────────────────────────────────────────────────────────

function WBSTreeView({ tasks, canManage, stages, users, projectId, onReload }: {
  tasks: Task[]; canManage: boolean; stages: Stage[]; users: any[];
  projectId: string; onReload: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<ModalMode>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  const toggleCollapse = (id: string) =>
    setCollapsed(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const handleDelete = async (task: Task) => {
    try { await api.delete(`/tasks/${task.id}`); onReload(); }
    catch (err: any) { alert(err.response?.data?.error || 'Ошибка'); }
    finally { setDeleteTarget(null); }
  };

  const flatTree = buildWBSTree(tasks);

  const visible: FlatNode[] = [];
  const hiddenBelow = new Set<string>();
  for (const node of flatTree) {
    if (node.task.parent_task_id && hiddenBelow.has(node.task.parent_task_id)) {
      hiddenBelow.add(node.task.id);
      continue;
    }
    if (collapsed.has(node.task.id)) hiddenBelow.add(node.task.id);
    visible.push(node);
  }

  return (
    <div className="card overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">Всего задач: {tasks.length}</span>
        {canManage && (
          <button onClick={() => setModal({ type: 'create' })}
            className="btn-primary text-sm py-1.5">
            + Задача
          </button>
        )}
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 border-y border-gray-200 text-left text-xs text-gray-500 font-medium">
            <th className="py-2 px-2 w-12">№</th>
            <th className="py-2 px-3 min-w-[260px]">Название</th>
            <th className="py-2 px-3">Исполнитель</th>
            <th className="py-2 px-3">Статус</th>
            <th className="py-2 px-3">Приоритет</th>
            <th className="py-2 px-3">Начало</th>
            <th className="py-2 px-3">Срок</th>
            <th className="py-2 px-3 text-center">Бюджет</th>
            <th className="py-2 px-3 text-center">Часы</th>
            <th className="py-2 px-3 w-24 text-center">Действия</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((node, idx) => {
            const { task, depth, wbs, hasChildren } = node;
            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
            const canEditRow = canManage || (user?.role === 'worker' && task.assignee_id === user?.id);
            const isCollapsed = collapsed.has(task.id);
            const isEven = idx % 2 === 0;

            return (
              <tr key={task.id}
                className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors group ${isEven ? '' : 'bg-gray-50/50'}`}>

                <td className="py-2 px-2 text-xs text-gray-400 font-mono whitespace-nowrap">{wbs}</td>

                <td className="py-2 px-3">
                  <div className="flex items-center gap-1.5" style={{ paddingLeft: depth * 20 }}>
                    {hasChildren ? (
                      <button onClick={() => toggleCollapse(task.id)}
                        className="w-4 h-4 flex-shrink-0 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors text-xs">
                        {isCollapsed ? '▶' : '▼'}
                      </button>
                    ) : (
                      <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center text-gray-200 text-xs">
                        {depth > 0 ? '└' : '·'}
                      </span>
                    )}
                    <span className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                      {task.title}
                    </span>
                    {task.parent_task_id && (
                      <span className="text-gray-300 text-xs ml-1">↳</span>
                    )}
                  </div>
                </td>

                <td className="py-2 px-3 text-gray-500 whitespace-nowrap">
                  {task.assignee_name || <span className="text-gray-300">—</span>}
                </td>

                <td className="py-2 px-3">
                  <StatusBadge status={task.status} />
                </td>

                <td className="py-2 px-3">
                  <PriorityBadge priority={task.priority} />
                </td>

                <td className="py-2 px-3 text-gray-500 whitespace-nowrap text-xs">
                  {task.start_date ? new Date(task.start_date).toLocaleDateString('ru') : <span className="text-gray-300">—</span>}
                </td>

                <td className={`py-2 px-3 whitespace-nowrap text-xs ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
                  {task.due_date ? new Date(task.due_date).toLocaleDateString('ru') : <span className="text-gray-300">—</span>}
                </td>

                <td className="py-2 px-3 text-center text-xs text-gray-500 whitespace-nowrap">
                  {task.budget != null
                    ? <span className="text-gray-700 font-medium">{task.budget.toFixed(2)} BYN</span>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="py-2 px-3 text-center text-xs text-gray-500 whitespace-nowrap">
                  <span className="text-gray-700 font-medium">{task.actual_hours ?? 0}</span>
                  <span className="text-gray-300 mx-0.5">/</span>
                  <span>{task.estimated_hours ?? '—'}</span>
                </td>

                <td className="py-2 px-3">
                  <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canManage && (
                      <button
                        onClick={() => setModal({ type: 'create', parentId: task.id })}
                        className="p-1 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                        title="Добавить подзадачу">
                        +
                      </button>
                    )}
                    {canEditRow && (
                      <button
                        onClick={() => setModal({ type: 'edit', task })}
                        className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Редактировать">
                        ✎
                      </button>
                    )}
                    {canManage && (
                      <button
                        onClick={() => setDeleteTarget(task)}
                        className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Удалить">
                        ✕
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}

          {tasks.length === 0 && (
            <tr>
              <td colSpan={9} className="py-12 text-center text-gray-400 text-sm">
                Нет задач. {canManage && 'Нажмите «+ Задача» для создания.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {modal && (
        <TaskFormModal
          mode={modal}
          projectId={projectId}
          stages={stages}
          users={users}
          onSave={() => { setModal(null); onReload(); }}
          onClose={() => setModal(null)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          task={deleteTarget}
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const [project, setProject]   = useState<Project | null>(null);
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [stages, setStages]     = useState<Stage[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<'board'|'list'|'gantt'|'members'>('board');
  const [modal, setModal]       = useState<ModalMode>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  const loadAll = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [pRes, tRes, sRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/tasks/project/${id}`),
        api.get(`/stages/project/${id}`),
      ]);
      setProject(pRes.data);
      setTasks(tRes.data);
      setStages(sRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, [id]);

  useProjectSocket(id, loadAll);

  const handleDelete = async (task: Task) => {
    try { await api.delete(`/tasks/${task.id}`); await loadAll(); }
    catch (err: any) { alert(err.response?.data?.error || 'Ошибка удаления'); }
    finally { setDeleteTarget(null); }
  };

  if (loading) return <div className="text-center text-gray-400 py-16">Загрузка...</div>;
  if (!project) return <div className="text-center text-gray-400 py-16">Проект не найден</div>;

  const tasksByStatus: Record<string, Task[]> = { todo: [], in_progress: [], review: [], done: [] };
  tasks.forEach(t => { (tasksByStatus[t.status] ?? tasksByStatus['todo']).push(t); });

  const STATUS_COLS = [
    { key: 'todo',        label: 'К выполнению',  color: 'border-t-gray-300' },
    { key: 'in_progress', label: 'В работе',       color: 'border-t-blue-400' },
    { key: 'review',      label: 'На ревью',       color: 'border-t-purple-400' },
    { key: 'done',        label: 'Готово',          color: 'border-t-green-400' },
  ];

  const total = tasks.length;
  const done  = tasks.filter(t => t.status === 'done').length;
  const pct   = total ? Math.round((done / total) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link to="/projects" className="text-sm text-gray-400 hover:text-gray-600 mb-2 inline-block">
          ← Все проекты
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            {project.description && <p className="text-gray-500 mt-1">{project.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={project.status} />
            <PriorityBadge priority={project.priority} />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-4">
          {[
            { value: total, label: 'Задач', color: 'text-primary-600' },
            { value: done,  label: 'Завершено', color: 'text-green-600' },
            { value: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length, label: 'Просрочено', color: 'text-orange-500' },
            { value: `${pct}%`, label: 'Прогресс', color: 'text-gray-700' },
          ].map(({ value, label, color }) => (
            <div key={label} className="card text-center py-3">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <div className="bg-gray-100 rounded-full h-2">
            <div className={`h-2 rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-primary-500'}`}
              style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Tabs + action */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['board','list','gantt','members'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {tab === 'board' ? 'Доска' : tab === 'list' ? 'Список' : tab === 'gantt' ? 'Гант' : 'Участники'}
            </button>
          ))}
        </div>
        {canManage && activeTab !== 'list' && (
          <button className="btn-primary" onClick={() => setModal({ type: 'create' })}>+ Задача</button>
        )}
      </div>

      {/* Board */}
      {activeTab === 'board' && (
        <div className="grid grid-cols-4 gap-4">
          {STATUS_COLS.map(col => (
            <div key={col.key} className={`bg-gray-50 rounded-xl border-t-4 ${col.color} p-3`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm text-gray-700">{col.label}</h3>
                <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">
                  {tasksByStatus[col.key]?.length || 0}
                </span>
              </div>
              <div className="space-y-2">
                {(tasksByStatus[col.key] || []).map(task => (
                  <TaskCard key={task.id} task={task} canManage={canManage} onUpdate={loadAll}
                    onEdit={t => setModal({ type: 'edit', task: t })}
                    onDelete={t => setDeleteTarget(t)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* WBS List */}
      {activeTab === 'list' && (
        <WBSTreeView
          tasks={tasks}
          canManage={canManage}
          stages={stages}
          users={project.members || []}
          projectId={id!}
          onReload={loadAll}
        />
      )}

      {/* Gantt */}
      {activeTab === 'gantt' && (
        <GanttChart tasks={tasks} canEdit={canManage} />
      )}

      {/* Members */}
      {activeTab === 'members' && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Участники проекта ({project.members?.length || 0})</h3>
          <div className="space-y-3">
            {project.members?.map(m => (
              <div key={m.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-medium text-sm">
                    {m.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m.full_name}</p>
                    <p className="text-xs text-gray-400">{m.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge bg-gray-100 text-gray-600">{m.department || '—'}</span>
                  <span className="badge bg-primary-100 text-primary-700">{m.project_role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Global modals (board/gantt) */}
      {modal && activeTab !== 'list' && (
        <TaskFormModal
          mode={modal}
          projectId={id!}
          stages={stages}
          users={project.members || []}
          onSave={() => { setModal(null); loadAll(); }}
          onClose={() => setModal(null)}
        />
      )}

      {deleteTarget && activeTab !== 'list' && (
        <DeleteConfirm
          task={deleteTarget}
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
