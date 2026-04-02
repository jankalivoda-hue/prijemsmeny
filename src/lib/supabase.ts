import { createClient } from '@supabase/supabase-js';

// Tyto údaje nahraď těmi, které jsi získal v kroku 3
const supabaseUrl = 'TVOJE_PROJECT_URL';
const supabaseAnonKey = 'TVŮJ_ANON_PUBLIC_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
