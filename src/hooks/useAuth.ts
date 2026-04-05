import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Definice všech možných rolí v systému
export type UserRole = 'superadmin' | 'admin' | 'editor' | 'viewer' | 'user';

interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  must_change_password?: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = useCallback(async (username: string, pass: string) => {
    // Načtení uživatele z DB podle jména a hesla
    // Sloupec 'role' v DB musí obsahovat jednu z hodnot: superadmin, admin, editor, viewer, user
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
        role: (person.role as UserRole) || 'user', // Pokud role v DB chybí, nastavíme základní 'user'
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

  // Automatické přihlášení po refreshu
  useEffect(() => {
    const saved = localStorage.getItem('auth_session');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  return { 
    user, 
    // SuperAdmin: Má právo měnit role ostatním
    isSuperAdmin: user?.role === 'superadmin',
    // Admin/SuperAdmin: Mají právo na kompletní plánování
    isAdmin: user?.role === 'admin' || user?.role === 'superadmin',
    // Editor: Může upravovat, ale neřeší práva (volitelné použití)
    isEditor: user?.role === 'editor',
    // Pomocná funkce pro kontrolu, zda uživatel vůbec může něco měnit
    canEditAnything: ['superadmin', 'admin', 'editor'].includes(user?.role || ''),
    login, 
    logout 
  };
}
