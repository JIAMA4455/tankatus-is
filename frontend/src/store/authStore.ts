import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthState } from '@/types';
import { connectSocket, disconnectSocket } from '@/services/socket';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token: string, user: User) => {
        connectSocket(token);
        set({ token, user });
      },
      logout: () => {
        disconnectSocket();
        set({ token: null, user: null });
      },
    }),
    { name: 'tankatus-auth' }
  )
);

// Reconnect socket when the app loads with a stored token
const stored = JSON.parse(localStorage.getItem('tankatus-auth') || '{}');
if (stored?.state?.token) {
  connectSocket(stored.state.token);
}
