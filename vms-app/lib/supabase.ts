import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xnovmmctzrcdionvyfoo.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhub3ZtbWN0enJjZGlvbnZ5Zm9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwODQ4NTksImV4cCI6MjEwMjY2MDg1OX0.s8getZpdHpEmZumBPiF2Dpr4DEo0YMSTUogdZ3ua-DI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
