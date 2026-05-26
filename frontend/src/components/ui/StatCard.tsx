type Props = { label: string; value: string | number; sub?: string; color?: string };

export default function StatCard({ label, value, sub, color = 'text-primary-600' }: Props) {
  return (
    <div className="card">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}
