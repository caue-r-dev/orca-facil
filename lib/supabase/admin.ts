import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Server-only: never import this file from a Client Component.
// Used exclusively by the public /o/[id] route to fetch a single orçamento by id.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
