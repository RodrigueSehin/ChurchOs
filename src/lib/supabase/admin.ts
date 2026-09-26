import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client service-role : bypass RLS. Server-only, usage restreint (Route
 * Handlers d'administration, jobs Inngest) — jamais dans une Server Action
 * appelée directement depuis un formulaire utilisateur.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
