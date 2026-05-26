import { useMemo, useRef, useState } from 'react';
import type { Task } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  todo:        '#94a3b8',
  in_progress: '#3b82f6',
  review:      '#a855f7',
  done:        '#22c55e',
  cancelled:   '#ef4444',
};

const PRIORITY_BORDER: Record<string, string> = {
  low:      '#94a3b8',
  medium:   '#3b82f6',
  high:     '#f97316',
  critical: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  todo: 'К выполн.', in_progress: 'В работе', review: 'Ревью',
  done: 'Готово', cancelled: 'Отменено',
};

const ROW_H = 36;
const LEFT_W = 340;
const DAY_W = 28;
const HEADER_H = 56;

function getDaysArray(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function buildTree(tasks: Task[]): Task[] {
  const map = new Map(tasks.map(t => [t.id, { ...t, _children: [] as Task[] }]));
  const roots: Task[] = [];
  map.forEach(t => {
    if (t.parent_task_id && map.has(t.parent_task_id)) {
      (map.get(t.parent_task_id) as any)._children.push(t);
    } else {
      roots.push(t);
    }
  });
  const flatten = (nodes: Task[], depth = 0): Array<Task & { _depth: number }> =>
    nodes.flatMap(n => [
      { ...n, _depth: depth },
      ...flatten((n as any)._children || [], depth + 1),
    ]);
  return flatten(roots);
}

interface Props {
  tasks: Task[];
  canEdit: boolean;
  onUpdateDates?: (taskId: string, start: string, end: string) => void;
}

export default function GanttChart({ tasks, canEdit, onUpdateDates }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<'week' | 'month'>('month');
  const dayW = zoom === 'week' ? DAY_W * 2 : DAY_W;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { minDate, maxDate } = useMemo(() => {
    const dates: Date[] = [today];
    tasks.forEach(t => {
      if (t.start_date) dates.push(new Date(t.start_date));
      if (t.due_date)   dates.push(new Date(t.due_date));
    });
    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    min.setDate(min.getDate() - 3);
    max.setDate(max.getDate() + 7);
    return { minDate: min, maxDate: max };
  }, [tasks]);

  const days = useMemo(() => getDaysArray(minDate, maxDate), [minDate, maxDate]);
  const flatTasks = useMemo(() => buildTree(tasks), [tasks]);

  const dayOffset = (d: Date) => {
    const diff = Math.floor((d.getTime() - minDate.getTime()) / 86400000);
    return diff * dayW;
  };

  const todayX = dayOffset(today);

  const months = useMemo(() => {
    const result: Array<{ label: string; x: number; width: number }> = [];
    let cur: string | null = null;
    let startX = 0;
    days.forEach((d, i) => {
      const label = d.toLocaleString('ru', { month: 'long', year: 'numeric' });
      if (label !== cur) {
        if (cur !== null) result.push({ label: cur, x: startX, width: i * dayW - startX });
        cur = label;
        startX = i * dayW;
      }
    });
    if (cur) result.push({ label: cur, x: startX, width: days.length * dayW - startX });
    return result;
  }, [days, dayW]);

  const totalW = days.length * dayW;
  const totalH = flatTasks.length * ROW_H + HEADER_H;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="font-semibold text-gray-900">Диаграмма Ганта</h3>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['month', 'week'] as const).map(z => (
            <button key={z} onClick={() => setZoom(z)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                zoom === z ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {z === 'month' ? 'Месяц' : 'Неделя'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex border border-gray-200 rounded-lg overflow-hidden" style={{ maxHeight: '70vh' }}>
        {/* Левая панель — дерево задач */}
        <div className="flex-shrink-0 overflow-y-auto border-r border-gray-200" style={{ width: LEFT_W }}>
          {/* Заголовок */}
          <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200"
            style={{ height: HEADER_H }}>
            <div className="grid text-xs font-medium text-gray-500 px-3 h-full"
              style={{ gridTemplateColumns: '1fr 80px 70px' }}>
              <div className="flex items-end pb-1">Задача</div>
              <div className="flex items-end pb-1">Исполнитель</div>
              <div className="flex items-end pb-1">Статус</div>
            </div>
          </div>
          {/* Строки */}
          {flatTasks.map((task: any, i) => (
            <div key={task.id}
              className={`grid items-center px-3 border-b border-gray-50 text-xs ${
                i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
              }`}
              style={{ height: ROW_H, gridTemplateColumns: '1fr 80px 70px' }}>
              <div className="flex items-center gap-1 min-w-0"
                style={{ paddingLeft: task._depth * 16 }}>
                {task._depth > 0 && (
                  <span className="text-gray-300 flex-shrink-0">└</span>
                )}
                <div
                  className="w-2 h-2 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: PRIORITY_BORDER[task.priority] || '#94a3b8' }}
                />
                <span className="truncate text-gray-800 font-medium" title={task.title}>
                  {task.title}
                </span>
              </div>
              <span className="truncate text-gray-400">{task.assignee_name?.split(' ')[0] || '—'}</span>
              <span style={{ color: STATUS_COLORS[task.status] }} className="font-medium">
                {STATUS_LABELS[task.status] || task.status}
              </span>
            </div>
          ))}
        </div>

        {/* Правая панель — timeline */}
        <div ref={scrollRef} className="flex-1 overflow-auto">
          <svg width={totalW} height={totalH} style={{ display: 'block', minWidth: totalW }}>
            {/* Месяцы */}
            {months.map((m, i) => (
              <g key={i}>
                <rect x={m.x} y={0} width={m.width} height={28}
                  fill={i % 2 === 0 ? '#f8fafc' : '#f1f5f9'} />
                <text x={m.x + m.width / 2} y={18} textAnchor="middle"
                  fontSize={11} fill="#64748b" fontWeight="500"
                  style={{ textTransform: 'capitalize' }}>
                  {m.label}
                </text>
              </g>
            ))}

            {/* Дни */}
            {days.map((d, i) => {
              const x = i * dayW;
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              const isToday = d.toDateString() === today.toDateString();
              return (
                <g key={i}>
                  <rect x={x} y={28} width={dayW} height={HEADER_H - 28}
                    fill={isToday ? '#dbeafe' : isWeekend ? '#f8fafc' : 'white'} />
                  {(dayW >= 20 || d.getDate() === 1 || isToday) && (
                    <text x={x + dayW / 2} y={44} textAnchor="middle"
                      fontSize={10} fill={isToday ? '#2563eb' : isWeekend ? '#94a3b8' : '#cbd5e1'}
                      fontWeight={isToday ? '700' : '400'}>
                      {d.getDate()}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Фон строк */}
            {flatTasks.map((_, i) => (
              <rect key={i} x={0} y={HEADER_H + i * ROW_H} width={totalW} height={ROW_H}
                fill={i % 2 === 0 ? 'white' : '#f8fafc'}
                stroke="#f1f5f9" strokeWidth={0.5} />
            ))}

            {/* Вертикальные линии дней */}
            {days.map((_, i) => (
              <line key={i} x1={i * dayW} y1={HEADER_H} x2={i * dayW} y2={totalH}
                stroke="#f1f5f9" strokeWidth={1} />
            ))}

            {/* Линия "Сегодня" */}
            <line x1={todayX} y1={0} x2={todayX} y2={totalH}
              stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 3" opacity={0.8} />
            <rect x={todayX - 16} y={0} width={32} height={14} rx={3} fill="#3b82f6" />
            <text x={todayX} y={10} textAnchor="middle" fontSize={9} fill="white" fontWeight="600">
              Сегодня
            </text>

            {/* Задачи — бары */}
            {flatTasks.map((task: any, i) => {
              const y = HEADER_H + i * ROW_H;
              const hasStart = task.start_date || task.created_at;
              const hasEnd   = task.due_date;
              if (!hasStart && !hasEnd) return null;

              const startD = new Date(task.start_date || task.created_at);
              const endD   = task.due_date ? new Date(task.due_date) : new Date(startD);
              if (!task.due_date) endD.setDate(endD.getDate() + 1);

              const x = dayOffset(startD);
              const w = Math.max(dayOffset(endD) - x + dayW, dayW);
              const barH = ROW_H * 0.55;
              const barY = y + (ROW_H - barH) / 2;
              const color = STATUS_COLORS[task.status] || '#94a3b8';
              const isOverdue = task.due_date && endD < today && task.status !== 'done';

              const progress = task.status === 'done' ? 1
                : task.status === 'in_progress' ? 0.5
                : task.status === 'review' ? 0.8
                : 0;

              return (
                <g key={task.id}>
                  {/* Фон бара */}
                  <rect x={x} y={barY} width={w} height={barH} rx={4}
                    fill={isOverdue ? '#fecaca' : `${color}25`}
                    stroke={isOverdue ? '#ef4444' : color}
                    strokeWidth={1.5} />
                  {/* Прогресс */}
                  {progress > 0 && (
                    <rect x={x} y={barY} width={w * progress} height={barH} rx={4}
                      fill={color} opacity={0.7} />
                  )}
                  {/* Метка */}
                  {w > 40 && (
                    <text x={x + 6} y={barY + barH * 0.68} fontSize={10} fill={progress > 0.4 ? 'white' : '#374151'}
                      fontWeight="500">
                      {task.title.length > Math.floor(w / 7)
                        ? task.title.slice(0, Math.floor(w / 7)) + '…'
                        : task.title}
                    </text>
                  )}
                  {/* Ромб для задачи без длительности */}
                  {!task.due_date && (
                    <polygon
                      points={`${x + dayW / 2},${barY} ${x + dayW},${barY + barH / 2} ${x + dayW / 2},${barY + barH} ${x},${barY + barH / 2}`}
                      fill={color} />
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Легенда */}
      <div className="flex items-center gap-4 mt-3 px-1 flex-wrap">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: STATUS_COLORS[key] }} />
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-blue-500" style={{ borderTop: '2px dashed #3b82f6' }} />
          <span className="text-xs text-gray-500">Сегодня</span>
        </div>
      </div>
    </div>
  );
}
