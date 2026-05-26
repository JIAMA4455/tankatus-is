import { useEffect, useState } from 'react';
import api from '@/services/api';
import type { User } from '@/types';
import { useAuthStore } from '@/store/authStore';

const ROLES = ['worker', 'manager', 'admin', 'viewer'];
const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор', manager: 'Менеджер', worker: 'Работник', viewer: 'Наблюдатель',
};
const DEPARTMENTS = [
  'IT-отдел', 'Отдел продаж', 'Отдел маркетинга',
  'Отдел логистики', 'Бухгалтерия', 'Юридический отдел',
];

function CreateUserModal({ onSave, onClose }: { onSave: () => void; onClose: () => void }) {
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'worker', department: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/users', form);
      onSave();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка создания');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-4">Новый пользователь</h3>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Полное имя *</label>
            <input className="input" placeholder="Иванов Иван Иванович" required
              value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Email *</label>
            <input className="input" type="email" placeholder="user@tankatus.by" required
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Пароль *</label>
            <input className="input" type="password" placeholder="Минимум 6 символов" required minLength={6}
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Роль</label>
              <select className="input" value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Отдел</label>
              <select className="input" value={form.department}
                onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                <option value="">Не указан</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}
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

function EditRoleModal({ user, onSave, onClose }: { user: User; onSave: () => void; onClose: () => void }) {
  const [role, setRole] = useState<User['role']>(user.role);
  const [isActive, setIsActive] = useState(user.is_active);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await api.put(`/users/${user.id}`, { role, is_active: isActive });
      onSave();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-lg font-semibold mb-1">Редактировать пользователя</h3>
        <p className="text-sm text-gray-500 mb-4">{user.full_name} — {user.email}</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Роль</label>
            <select className="input" value={role} onChange={e => setRole(e.target.value as User['role'])}>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded" />
            <span className="text-sm text-gray-700">Активный аккаунт</span>
          </label>
        </div>
        <div className="flex gap-3 pt-4">
          <button className="btn-secondary flex-1" onClick={onClose}>Отмена</button>
          <button className="btn-primary flex-1" onClick={submit} disabled={loading}>
            {loading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === 'admin';
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  const load = () => {
    setLoading(true);
    api.get('/users').then(r => setUsers(r.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter(u =>
    !search || u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const ROLE_COLORS: Record<string, string> = {
    admin: 'bg-red-100 text-red-700',
    manager: 'bg-blue-100 text-blue-700',
    worker: 'bg-green-100 text-green-700',
    viewer: 'bg-gray-100 text-gray-600',
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Пользователи</h1>
          <p className="text-gray-500 text-sm mt-0.5">{users.filter(u => u.is_active).length} активных</p>
        </div>
        {isAdmin && (
          <button className="btn-primary w-full sm:w-auto text-center" onClick={() => setShowCreate(true)}>+ Новый пользователь</button>
        )}
      </div>

      <div className="mb-4 md:mb-6">
        <input className="input w-full sm:max-w-xs" placeholder="Поиск по имени или email..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-16">Загрузка...</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Пользователь</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Отдел</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Роль</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Статус</th>
                  {isAdmin && <th className="text-left py-3 px-4 text-gray-500 font-medium">Действия</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => (
                  <tr key={user.id} className={`border-b border-gray-50 hover:bg-gray-50 ${!user.is_active ? 'opacity-50' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-semibold text-xs">
                          {user.full_name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.full_name}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-500">{user.department || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`badge ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-600'}`}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {user.is_active ? 'Активен' : 'Заблокирован'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4">
                        {user.id !== currentUser?.id && (
                          <button className="text-xs text-primary-600 hover:underline"
                            onClick={() => setEditUser(user)}>
                            Изменить
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(user => (
              <div key={user.id} className={`card ${!user.is_active ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-semibold text-sm">
                      {user.full_name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{user.full_name}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                  </div>
                  <span className={`badge text-xs ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-600'}`}>
                    {ROLE_LABELS[user.role] || user.role}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{user.department || '—'}</span>
                    <span className={`badge text-xs ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {user.is_active ? 'Активен' : 'Заблокирован'}
                    </span>
                  </div>
                  {isAdmin && user.id !== currentUser?.id && (
                    <button className="text-xs text-primary-600 font-medium"
                      onClick={() => setEditUser(user)}>
                      Изменить
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showCreate && (
        <CreateUserModal onSave={() => { setShowCreate(false); load(); }} onClose={() => setShowCreate(false)} />
      )}
      {editUser && (
        <EditRoleModal user={editUser} onSave={() => { setEditUser(null); load(); }} onClose={() => setEditUser(null)} />
      )}
    </div>
  );
}
