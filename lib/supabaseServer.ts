import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// This client should ONLY be used in API routes or Server Actions.
// It bypasses RLS to allow administrative tasks like weekly snapshots.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
