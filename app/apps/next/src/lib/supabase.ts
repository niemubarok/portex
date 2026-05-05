import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Use service role key on server for full access, publishable key on client
export const supabase = createClient(
  supabaseUrl,
  typeof window === 'undefined' ? (supabaseServiceRoleKey || supabasePublishableKey) : supabasePublishableKey
)

// Helper to get server-side supabase with service role
export const getSupabaseServer = () => {
  return createClient(supabaseUrl, supabaseServiceRoleKey || supabasePublishableKey)
}
