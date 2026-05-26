const STATUS_COLORS: Record<string, string> = {
  planning:    'bg-gray-100 text-gray-700',
  active:      'bg-green-100 text-green-700',
  on_hold:     'bg-yellow-100 text-yellow-700',
  completed:   'bg-blue-100 text-blue-700',
  cancelled:   'bg-red-100 text-red-700',
  todo:        'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  review:      'bg-purple-100 text-purple-700',
  done:        'bg-green-100 text-green-700',
  pending:     'bg-gray-100 text-gray-600',
};

const STATUS_LABELS: Record<string, string> = {
  planning: 'Планирование', active: 'Активный', on_hold: 'На паузе',
  completed: 'Завершён', cancelled: 'Отменён',
  todo: 'К выполнению', in_progress: 'В работе', review: 'На ревью',
  done: 'Готово', pending: 'Ожидание',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Низкий', medium: 'Средний', high: 'Высокий', critical: 'Критический',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={`badge ${PRIORITY_COLORS[priority] || 'bg-gray-100 text-gray-700'}`}>
      {PRIORITY_LABELS[priority] || priority}
    </span>
  );
}
