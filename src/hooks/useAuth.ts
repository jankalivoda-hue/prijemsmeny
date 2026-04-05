import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Zjednodušená definice rolí podle tvých požadavků
export type UserRole = 'superadmin' | 'admin' | 'user';

interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  must_change_password?: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = useCallback(async (username: string, pass: string) => {
    const { data: person, error } = await supabase
      .from('people')
      .select('*') 
      .eq('name', username)
      .eq('password', pass)
      .single();

    if (person) {
      const userData: AuthUser = { 
        id: person.id, 
        name: person.name, 
        role: (person.role as UserRole) || 'user',
        must_change_password: person.must_change_password 
      };
      
      localStorage.setItem('auth_session', JSON.stringify(userData));
      setUser(userData);
      return true;
    }

    if (error) console.error("Login error:", error.message);
    alert('Nesprávné jméno nebo heslo!');
    return false;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_session');
    setUser(null);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('auth_session');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  return { 
    user, 
    // SuperAdmin: Může úplně vše (včetně školení a skupin)
    isSuperAdmin: user?.role === 'superadmin',
    // Admin/SuperAdmin: Mohou plánovat směny a přidávat lidi
    isAdmin: user?.role === 'admin' || user?.role === 'superadmin',
    // User: Pouze pro běžné zaměstnance (omezený pohled)
    isOnlyUser: user?.role === 'user',
    login, 
    logout 
  };
}
