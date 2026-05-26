import { useEffect, useState } from 'react';
import api from '@/services/api';
import type { Task } from '@/types';
import { StatusBadge, PriorityBadge } from '@/components/ui/Badges';
import { Link } from 'react-router-dom';

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/tasks/my')
      .then(r => setTasks(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const changeStatus = async (id: string, status: string) => {
    try {
      await api.put(`/tasks/${id}`, { status });
      load();
    } catch (e) { console.error(e); }
  };

  const filtered = filter ? tasks.filter(t => t.status === filter) : tasks;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Мои задачи</h1>
        <p className="text-gray-500 text-sm mt-1">{tasks.length} активных задач</p>
      </div>

      <div className="flex gap-2 mb-6">
        {['', 'todo', 'in_progress', 'review'].map(s => (
          <button key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {s === '' ? 'Все' : s === 'todo' ? 'К выполнению' : s === 'in_progress' ? 'В работе' : 'На ревью'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-16">Загрузка...</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(task => {
            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
            return (
              <div key={task.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {task.project_name && (
                        <Link to={`/projects/${task.project_id}`}
                          className="text-xs text-primary-600 hover:underline font-medium">
                          {task.project_name as string}
                        </Link>
                      )}
                      {task.stage_name && (
                        <span className="text-xs text-gray-400">/ {task.stage_name}</span>
                      )}
                    </div>
                    <p className="font-medium text-gray-900 mb-2">{task.title}</p>
                    {task.description && (
                      <p className="text-sm text-gray-500 line-clamp-2 mb-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={task.status} />
                      <PriorityBadge priority={task.priority} />
                      {task.estimated_hours && (
                        <span className="text-xs text-gray-400">{task.actual_hours || 0}/{task.estimated_hours}ч</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {task.due_date && (
                      <span className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                        {new Date(task.due_date).toLocaleDateString('ru')}
                      </span>
                    )}
                    <select
                      className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                      value={task.status}
                      onChange={e => changeStatus(task.id, e.target.value)}
                    >
                      {['todo','in_progress','review','done'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
          {!filtered.length && (
            <div className="text-center text-gray-400 py-16 card">
              Нет активных задач
            </div>
          )}
        </div>
      )}
    </div>
  );
}
