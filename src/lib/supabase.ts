import { createClient } from '@supabase/supabase-js';

// Tyto údaje nahraď těmi, které jsi získal v kroku 3
const supabaseUrl = 'https://qemmkkenjsuuhshcdhwl.supabase.co';
const supabaseAnonKey = 'sb_publishable_BIgAzoo0W9bA7F00iC5CFg_3VKtvGrg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
