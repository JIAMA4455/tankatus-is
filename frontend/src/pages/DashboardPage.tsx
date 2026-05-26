import { useEffect, useState } from 'react';
import api from '@/services/api';
import type { DashboardStats } from '@/types';
import StatCard from '@/components/ui/StatCard';
import { StatusBadge, PriorityBadge } from '@/components/ui/Badges';
import { useAuthStore } from '@/store/authStore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const PIE_COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6'];

const TASK_STATUS_LABELS: Record<string, string> = {
  todo: 'К выполнению', in_progress: 'В работе', review: 'На ревью',
  done: 'Готово', cancelled: 'Отменено',
};

const PROJECT_STATUS_LABELS: Record<string, string> = {
  planning: 'Планирование', active: 'Активные',
  completed: 'Завершённые', on_hold: 'На паузе', cancelled: 'Отменены',
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/kpi/dashboard')
      .then(r => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Загрузка...</div>
      </div>
    );
  }

  const totalProjects = stats?.project_stats.reduce((s, r) => s + parseInt(r.cnt), 0) || 0;
  const activeProjects = stats?.project_stats.find(r => r.status === 'active')?.cnt || '0';
  const totalTasks = stats?.task_stats.reduce((s, r) => s + parseInt(r.cnt), 0) || 0;
  const doneTasks = stats?.task_stats.find(r => r.status === 'done')?.cnt || '0';

  const taskData = (stats?.task_stats || []).map(r => ({
    name: TASK_STATUS_LABELS[r.status] || r.status,
    value: parseInt(r.cnt),
  }));

  const projectData = (stats?.project_stats || []).map(r => ({
    name: PROJECT_STATUS_LABELS[r.status] || r.status,
    value: parseInt(r.cnt),
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Добро пожаловать, {user?.full_name?.split(' ')[1] || user?.full_name}
        </h1>
        <p className="text-gray-500 mt-1">Обзор состояния проектов и задач</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard label="Всего проектов"    value={totalProjects} sub="в системе" />
        <StatCard label="Активных проектов" value={activeProjects} sub="в работе" color="text-green-600" />
        <StatCard label="Всего задач"       value={totalTasks}    sub="в системе" />
        <StatCard label="Просрочено задач"  value={stats?.overdue_tasks || 0} sub="требуют внимания" color="text-red-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Задачи по статусам</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={taskData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {taskData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Проекты по статусам</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={projectData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {!!stats?.recent_active_projects?.length && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Активные проекты</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Проект</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Приоритет</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Срок</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Прогресс</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_active_projects.map((p) => {
                  const total = parseInt(p.total_tasks as any) || 0;
                  const done  = parseInt(p.done_tasks as any) || 0;
                  const pct   = total ? Math.round((done / total) * 100) : 0;
                  return (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-3 font-medium text-gray-900">{p.name}</td>
                      <td className="py-3 px-3"><PriorityBadge priority={p.priority} /></td>
                      <td className="py-3 px-3 text-gray-500">{p.end_date ? new Date(p.end_date).toLocaleDateString('ru') : '—'}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                            <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-8">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
