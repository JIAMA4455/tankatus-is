import { useEffect, useState, useCallback } from 'react';
import api from '@/services/api';
import type { Project, KpiSnapshot } from '@/types';
import { useAuthStore } from '@/store/authStore';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';

// ─── KPI Indicator card ──────────────────────────────────────────────────────

function KpiCard({ label, value, good, unit = '', hint }: {
  label: string; value: number | null | undefined;
  good: (v: number) => boolean; unit?: string; hint?: string;
}) {
  if (value == null) return (
    <div className="card text-center py-4 border-t-4 border-t-gray-200">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-300">—</p>
      {hint && <p className="text-xs text-gray-300 mt-1">{hint}</p>}
    </div>
  );
  const ok = good(value);
  return (
    <div className={`card text-center py-4 border-t-4 ${ok ? 'border-t-green-400' : 'border-t-red-400'}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${ok ? 'text-green-600' : 'text-red-600'}`}>
        {value.toFixed(2)}{unit}
      </p>
      <p className={`text-xs mt-1 ${ok ? 'text-green-500' : 'text-red-500'}`}>
        {ok ? 'В норме' : 'Отклонение'}
      </p>
    </div>
  );
}

// ─── Auto KPI block ──────────────────────────────────────────────────────────

interface AutoKpi {
  bac: number; pv: number; ev: number; ac: number;
  spi: number|null; cpi: number|null; cv: number|null; sv: number|null;
  eac: number|null; etc: number|null; vac: number|null; progress: number;
  snapshot_date: string; tasks_count: number;
}

function AutoKpiSection({ projectId, canManage, onSnapshotSaved }: {
  projectId: string; canManage: boolean; onSnapshotSaved: () => void;
}) {
  const [data, setData]     = useState<AutoKpi | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/kpi/project/${projectId}/auto`)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const saveSnapshot = async () => {
    setSaving(true);
    try {
      await api.post(`/kpi/project/${projectId}/auto-snapshot`);
      onSnapshotSaved();
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card py-8 text-center text-gray-400">Расчёт KPI...</div>;
  if (!data) return null;

  const noTasks  = data.tasks_count === 0;
  const noBudget = data.bac === 0;

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-gray-900">Текущие показатели (авто)</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Рассчитано на {new Date(data.snapshot_date).toLocaleDateString('ru')} · {data.tasks_count} задач
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-secondary text-xs py-1.5 px-3">
            Обновить
          </button>
          {canManage && (
            <button onClick={saveSnapshot} disabled={saving || noTasks}
              className="btn-primary text-xs py-1.5 px-3 disabled:opacity-50">
              {saving ? 'Сохранение...' : 'Сохранить снимок'}
            </button>
          )}
        </div>
      </div>

      {(noTasks || noBudget) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-sm text-amber-700">
          {noTasks
            ? 'Нет задач в проекте. Создайте задачи с плановыми часами для расчёта KPI.'
            : 'Нет задач с плановыми часами. Укажите «Плановые часы» в задачах для расчёта KPI.'}
        </div>
      )}

      {/* PV / EV / AC / BAC */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'BAC', value: data.bac, color: 'text-gray-700', hint: 'Бюджет по завершению' },
          { label: 'PV',  value: data.pv,  color: 'text-blue-600',  hint: 'Плановый объём' },
          { label: 'EV',  value: data.ev,  color: 'text-green-600', hint: 'Освоенный объём' },
          { label: 'AC',  value: data.ac,  color: 'text-orange-500',hint: 'Фактические затраты' },
        ].map(({ label, value, color, hint }) => (
          <div key={label} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">{hint}</p>
            <p className={`text-xl font-bold ${color}`}>{value.toFixed(2).replace('.', ',')} BYN</p>
            <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Прогресс */}
      <div className="mb-5">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Прогресс освоения</span>
          <span className="font-medium">{data.progress}%</span>
        </div>
        <div className="bg-gray-100 rounded-full h-2.5">
          <div className={`h-2.5 rounded-full transition-all ${data.progress >= 100 ? 'bg-green-500' : 'bg-primary-500'}`}
            style={{ width: `${Math.min(data.progress, 100)}%` }} />
        </div>
      </div>

      {/* SPI / CPI / CV / SV */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="SPI — Индекс сроков"    value={data.spi} good={v => v >= 1}
          hint={data.pv === 0 ? 'Нет задач с дедлайном ≤ сегодня' : undefined} />
        <KpiCard label="CPI — Индекс стоимости" value={data.cpi} good={v => v >= 1}
          hint={data.ac === 0 ? 'Нет фактических затрат' : undefined} />
        <KpiCard label="SV — Отклонение сроков"    value={data.sv}  good={v => v >= 0} unit=" BYN" />
        <KpiCard label="CV — Отклонение стоимости" value={data.cv}  good={v => v >= 0} unit=" BYN" />
      </div>

      {(data.eac != null || data.etc != null || data.vac != null) && (
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">EAC — Прогноз итоговых затрат</p>
            <p className="text-xl font-bold text-orange-600">{data.eac?.toFixed(2).replace('.', ',')} BYN</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">ETC — Оставшиеся затраты</p>
            <p className="text-xl font-bold text-purple-600">{data.etc?.toFixed(2).replace('.', ',')} BYN</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">VAC — Разница при завершении</p>
            <p className={`text-xl font-bold ${(data.vac ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.vac?.toFixed(2).replace('.', ',')} BYN
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Manual snapshot form ────────────────────────────────────────────────────

function KpiForm({ projectId, onSave, onClose }: {
  projectId: string; onSave: () => void; onClose: () => void;
}) {
  const [form, setForm] = useState({
    planned_value: '', earned_value: '', actual_cost: '',
    budget_at_completion: '', snapshot_date: new Date().toISOString().slice(0,10),
  });
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/kpi/project/${projectId}`, {
        ...form,
        planned_value: parseFloat(form.planned_value),
        earned_value:  parseFloat(form.earned_value),
        actual_cost:   parseFloat(form.actual_cost),
        budget_at_completion: form.budget_at_completion ? parseFloat(form.budget_at_completion) : undefined,
      });
      onSave();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Ручной снимок KPI</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Дата снимка</label>
            <input type="date" className="input" value={form.snapshot_date}
              onChange={e => set('snapshot_date', e.target.value)} required />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">PV — Плановая стоимость</label>
            <input type="number" className="input" placeholder="0" step="0.01" required
              value={form.planned_value} onChange={e => set('planned_value', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">EV — Освоенный объём</label>
            <input type="number" className="input" placeholder="0" step="0.01" required
              value={form.earned_value} onChange={e => set('earned_value', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">AC — Фактические затраты</label>
            <input type="number" className="input" placeholder="0" step="0.01" required
              value={form.actual_cost} onChange={e => set('actual_cost', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">BAC — Бюджет по завершению (опц.)</label>
            <input type="number" className="input" placeholder="0" step="0.01"
              value={form.budget_at_completion} onChange={e => set('budget_at_completion', e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function KpiPage() {
  const user = useAuthStore((s) => s.user);
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const [projects, setProjects]   = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [snapshots, setSnapshots] = useState<KpiSnapshot[]>([]);
  const [summary, setSummary]     = useState<any>(null);
  const [showForm, setShowForm]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [snapshotKey, setSnapshotKey] = useState(0);

  useEffect(() => {
    api.get('/projects').then(r => {
      setProjects(r.data);
      if (r.data.length) setSelectedProject(r.data[0].id);
    }).catch(console.error);
  }, []);

  const loadHistory = useCallback(() => {
    if (!selectedProject) return;
    setLoading(true);
    Promise.all([
      api.get(`/kpi/project/${selectedProject}`),
      api.get(`/kpi/project/${selectedProject}/summary`),
    ]).then(([kRes, sRes]) => {
      setSnapshots(kRes.data);
      setSummary(sRes.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [selectedProject]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const chartData = snapshots.map(s => ({
    date: new Date(s.snapshot_date).toLocaleDateString('ru'),
    PV: Number(s.planned_value),
    EV: Number(s.earned_value),
    AC: Number(s.actual_cost),
  }));

  const taskStats     = summary?.task_stats     || [];
  const resourceStats = summary?.resource_stats || [];

  const STATUS_LABELS: Record<string,string> = {
    todo:'К выполнению', in_progress:'В работе', review:'На ревью',
    done:'Готово', cancelled:'Отменено',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">KPI проектов</h1>
          <p className="text-gray-500 text-sm mt-1">Анализ методом освоенного объёма (EVM)</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <select className="input max-w-xs" value={selectedProject}
          onChange={e => setSelectedProject(e.target.value)}>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {canManage && (
          <button className="btn-secondary text-sm" onClick={() => setShowForm(true)}>
            + Ручной снимок
          </button>
        )}
      </div>

      {selectedProject && (
        <AutoKpiSection
          key={`${selectedProject}-${snapshotKey}`}
          projectId={selectedProject}
          canManage={canManage}
          onSnapshotSaved={() => { setSnapshotKey(k => k + 1); loadHistory(); }}
        />
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-8">Загрузка истории...</div>
      ) : (
        <>
          {chartData.length > 0 && (
            <div className="card mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">История снимков — PV / EV / AC</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine y={0} stroke="#e5e7eb" />
                  <Line type="monotone" dataKey="PV" stroke="#6b7280" strokeDasharray="4 4" name="PV (план)" />
                  <Line type="monotone" dataKey="EV" stroke="#3b82f6" strokeWidth={2} name="EV (освоено)" />
                  <Line type="monotone" dataKey="AC" stroke="#ef4444" strokeWidth={2} name="AC (факт)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {taskStats.length > 0 && (
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-4">Задачи по статусам</h3>
                <div className="space-y-2">
                  {taskStats.map((ts: any) => (
                    <div key={ts.status} className="flex items-center justify-between py-1">
                      <span className="text-sm text-gray-600">{STATUS_LABELS[ts.status] || ts.status}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold text-gray-800">{ts.cnt}</span>
                        <span className="text-xs text-gray-400 w-20 text-right">
                          {ts.est_h ? `${Number(ts.est_h).toFixed(0)} ч план` : '—'}
                        </span>
                        <span className="text-xs text-gray-400 w-20 text-right">
                          {ts.act_h ? `${Number(ts.act_h).toFixed(0)} ч факт` : '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {resourceStats.length > 0 && (
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-4">Загрузка исполнителей</h3>
                <div className="space-y-3">
                  {resourceStats.map((r: any) => {
                    const planned = Number(r.planned) || 0;
                    const actual  = Number(r.actual)  || 0;
                    const pct = planned > 0 ? Math.min((actual / planned) * 100, 150) : 0;
                    const over = actual > planned && planned > 0;
                    return (
                      <div key={r.id || r.full_name}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{r.full_name}</span>
                          <span className={`text-xs ${over ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>
                            {actual.toFixed(0)} / {planned.toFixed(0)} ч · {r.task_count} задач
                          </span>
                        </div>
                        <div className="bg-gray-100 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full transition-all ${over ? 'bg-orange-400' : 'bg-primary-500'}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {snapshots.length === 0 && !selectedProject && (
            <div className="text-center text-gray-400 py-16 card">
              Выберите проект для просмотра KPI
            </div>
          )}
        </>
      )}

      {showForm && selectedProject && (
        <KpiForm
          projectId={selectedProject}
          onSave={() => { setShowForm(false); loadHistory(); }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
