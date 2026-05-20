import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || "https://lxkcmvywtgkmgwumpiud.supabase.co";
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4a2Ntdnl3dGdrbWd3dW1waXVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MDU5MTIsImV4cCI6MjA5NDA4MTkxMn0.prB_Jdtir97CjHN7GobkkM3JvVBZzeJ6MCAQF1Hqmjw";

// Guard: only create client when both vars are present to prevent crash
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;
