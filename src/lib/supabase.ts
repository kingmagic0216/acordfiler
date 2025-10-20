import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://znlnibnxvamplhccbozt.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpubG5pYm54dmFtcGxoY2Nib3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjIwNjMsImV4cCI6MjA3NjUzODA2M30.xWiWSG9nstPl3DjUAmpHhZLN5Yano7a1L0Yu6IPmD6g';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
