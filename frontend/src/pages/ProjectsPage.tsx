import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/services/api';
import type { Project } from '@/types';
import { StatusBadge, PriorityBadge } from '@/components/ui/Badges';
import { useAuthStore } from '@/store/authStore';
import { useProjectsSocket } from '@/hooks/useSocket';

const STATUSES   = ['planning','active','on_hold','completed','cancelled'];
const PRIORITIES = ['low','medium','high','critical'];
const STATUS_LABELS: Record<string,string> = {
  planning:'Планирование', active:'Активный', on_hold:'Приостановлен',
  completed:'Завершён', cancelled:'Отменён',
};
const PRIORITY_LABELS: Record<string,string> = {
  low:'Низкий', medium:'Средний', high:'Высокий', critical:'Критический',
};

function ProjectForm({ onSave, onClose }: { onSave: () => void; onClose: () => void }) {
  const [form, setForm] = useState({
    name: '', description: '', priority: 'medium',
    status: 'planning', start_date: '', end_date: '', budget: '',
  });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/projects', { ...form, budget: form.budget ? parseFloat(form.budget) : undefined });
      onSave();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Новый проект</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input className="input" placeholder="Название *" value={form.name}
            onChange={e => set('name', e.target.value)} required />
          <textarea className="input" rows={2} placeholder="Описание"
            value={form.description} onChange={e => set('description', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Статус</label>
              <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Приоритет</label>
              <select className="input" value={form.priority} onChange={e => set('priority', e.target.value)}>
                {PRIORITIES.map(s => <option key={s} value={s}>{PRIORITY_LABELS[s]}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Дата начала</label>
              <input type="date" className="input" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Дата завершения</label>
              <input type="date" className="input" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Бюджет (BYN)</label>
            <input className="input" type="number" min="0" step="0.01" placeholder="0.00"
              value={form.budget} onChange={e => set('budget', e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteProjectConfirm({ project, onConfirm, onCancel }: {
  project: Project; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-xl">⚠</div>
          <div>
            <p className="font-semibold text-gray-900">Удалить проект?</p>
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">«{project.name}»</p>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Будут удалены все задачи, этапы и KPI-снимки этого проекта. Действие необратимо.
        </p>
        <div className="flex gap-3">
          <button className="btn-secondary flex-1" onClick={onCancel}>Отмена</button>
          <button
            className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
            onClick={onConfirm}>
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const user = useAuthStore((s) => s.user);
  const canCreate  = user?.role === 'admin' || user?.role === 'manager';
  const canDelete  = user?.role === 'admin';

  const [projects, setProjects]       = useState<Project[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [filterStatus, setFilterStatus]     = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [search, setSearch]               = useState('');

  const load = () => {
    setLoading(true);
    api.get('/projects')
      .then(r => setProjects(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useProjectsSocket(load);

  const handleDelete = async (project: Project) => {
    try {
      await api.delete(`/projects/${project.id}`);
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка удаления');
    }
  };

  const filtered = projects.filter(p => {
    if (filterStatus   && p.status   !== filterStatus)   return false;
    if (filterPriority && p.priority !== filterPriority) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Проекты</h1>
          <p className="text-gray-500 text-sm mt-1">{projects.length} проектов</p>
        </div>
        {canCreate && (
          <button className="btn-primary w-full sm:w-auto text-center" onClick={() => setShowForm(true)}>+ Новый проект</button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4 md:mb-6">
        <input className="input w-full sm:max-w-xs" placeholder="Поиск по названию..." value={search}
          onChange={e => setSearch(e.target.value)} />
        <div className="flex gap-2">
          <select className="input flex-1 sm:max-w-[180px]" value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Все статусы</option>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <select className="input flex-1 sm:max-w-[180px]" value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}>
            <option value="">Все приоритеты</option>
            {PRIORITIES.map(s => <option key={s} value={s}>{PRIORITY_LABELS[s]}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-16">Загрузка...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((p) => {
            const total = Number(p.total_tasks) || 0;
            const done  = Number(p.done_tasks)  || 0;
            const pct   = total ? Math.round((done / total) * 100) : 0;
            const isOverdue = p.end_date && new Date(p.end_date) < new Date() && p.status !== 'completed';

            return (
              <div key={p.id} className="card hover:shadow-md transition-shadow group relative">
                {/* Delete button (admin only) */}
                {canDelete && (
                  <button
                    onClick={e => { e.preventDefault(); setDeleteTarget(p); }}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity
                               w-7 h-7 flex items-center justify-center rounded-full
                               text-gray-400 hover:text-red-500 hover:bg-red-50 text-sm z-10"
                    title="Удалить проект">
                    ✕
                  </button>
                )}

                <Link to={`/projects/${p.id}`} className="block">
                  <div className="flex items-start justify-between mb-3 pr-6">
                    <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2">
                      {p.name}
                    </h3>
                    <PriorityBadge priority={p.priority} />
                  </div>

                  {p.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">{p.description}</p>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <StatusBadge status={p.status} />
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Задачи</span>
                      <span>{done}/{total} ({pct}%)</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-primary-500'}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{p.manager_name || '—'}</span>
                    <div className="flex items-center gap-3">
                      {p.budget && (
                        <span className="text-gray-400">{Number(p.budget).toLocaleString('ru')} BYN</span>
                      )}
                      {p.end_date && (
                        <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                          до {new Date(p.end_date).toLocaleDateString('ru')}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}

          {!filtered.length && (
            <div className="col-span-full text-center text-gray-400 py-16">
              Проекты не найдены
            </div>
          )}
        </div>
      )}

      {showForm && (
        <ProjectForm onSave={() => { setShowForm(false); load(); }} onClose={() => setShowForm(false)} />
      )}

      {deleteTarget && (
        <DeleteProjectConfirm
          project={deleteTarget}
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
