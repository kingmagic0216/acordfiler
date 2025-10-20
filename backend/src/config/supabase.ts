import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://znlnibnxvamplhccbozt.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpubG5pYm54dmFtcGxoY2Nib3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjIwNjMsImV4cCI6MjA3NjUzODA2M30.xWiWSG9nstPl3DjUAmpHhZLN5Yano7a1L0Yu6IPmD6g';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service role client for admin operations
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export default supabase;
