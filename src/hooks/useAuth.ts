import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Definice typu uživatele, aby obsahoval must_change_password
interface AuthUser {
  id: string;
  name: string;
  role: 'admin' | 'user';
  must_change_password?: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = useCallback(async (username: string, pass: string) => {
    // 1. Kontrola Admina
    if (username === 'admin' && pass === 'Ostrava8802') {
      const adminData: AuthUser = { 
        id: 'admin', 
        name: 'Administrátor', 
        role: 'admin' as const,
        must_change_password: false // Admin toto nepotřebuje
      };
      localStorage.setItem('auth_session', JSON.stringify(adminData));
      setUser(adminData);
      return true;
    }

    // 2. Kontrola Zaměstnance v DB
    // Přidali jsme .select('*'), aby se načetl i sloupec must_change_password
    const { data: person } = await supabase
      .from('people')
      .select('*') 
      .eq('name', username)
      .eq('password', pass)
      .single();

    if (person) {
      const userData: AuthUser = { 
        id: person.id, 
        name: person.name, 
        role: 'user' as const,
        must_change_password: person.must_change_password // DŮLEŽITÉ: Načtení z DB
      };
      
      localStorage.setItem('auth_session', JSON.stringify(userData));
      setUser(userData);
      return true;
    }

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

  return { user, isAdmin: user?.role === 'admin', login, logout };
}
