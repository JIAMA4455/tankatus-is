import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

const navItems = [
  { to: '/',          label: 'Дашборд',    icon: '📊' },
  { to: '/projects',  label: 'Проекты',    icon: '📁' },
  { to: '/tasks',     label: 'Мои задачи', icon: '✓' },
  { to: '/kpi',       label: 'KPI',        icon: '📈' },
  { to: '/users',     label: 'Команда',    icon: '👥' },
];

export default function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-60 min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="px-5 py-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">ИС</span>
          </div>
          <div>
            <p className="font-bold text-sm leading-none">Танкатус</p>
            <p className="text-gray-400 text-xs mt-0.5">IT-проекты</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <span className="text-base">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-700">
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
          <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <span>⎋</span> Выход
        </button>
      </div>
    </aside>
  );
}
