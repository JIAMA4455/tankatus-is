import { useEffect, useRef } from 'react';
import { getSocket } from '@/services/socket';

export function useProjectSocket(projectId: string | undefined, onReload: () => void) {
  const reloadRef = useRef(onReload);
  reloadRef.current = onReload;

  useEffect(() => {
    if (!projectId) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit('join:project', projectId);

    const handler = () => reloadRef.current();
    socket.on('task:created', handler);
    socket.on('task:updated', handler);
    socket.on('task:deleted', handler);
    socket.on('project:updated', handler);

    return () => {
      socket.emit('leave:project', projectId);
      socket.off('task:created', handler);
      socket.off('task:updated', handler);
      socket.off('task:deleted', handler);
      socket.off('project:updated', handler);
    };
  }, [projectId]);
}

export function useProjectsSocket(onReload: () => void) {
  const reloadRef = useRef(onReload);
  reloadRef.current = onReload;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handler = () => reloadRef.current();
    socket.on('projects:changed', handler);
    socket.on('project:deleted', handler);

    return () => {
      socket.off('projects:changed', handler);
      socket.off('project:deleted', handler);
    };
  }, []);
}
