import { useState, useCallback, useEffect } from 'react';

const AUTH_KEY = 'shift-schedule-auth';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'Ostrava8802';

export type UserRole = 'admin' | 'guest';

export function useAuth() {
  const [role, setRole] = useState<UserRole>(() => {
    try {
      return localStorage.getItem(AUTH_KEY) === 'admin' ? 'admin' : 'guest';
    } catch { return 'guest'; }
  });

  useEffect(() => {
    localStorage.setItem(AUTH_KEY, role);
  }, [role]);

  const login = useCallback((username: string, password: string): boolean => {
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      setRole('admin');
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setRole('guest');
  }, []);

  const isAdmin = role === 'admin';

  return { role, isAdmin, login, logout };
}
