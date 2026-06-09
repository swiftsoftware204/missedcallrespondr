import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders })

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "")
  const { email, password, full_name, role, tenant_id } = await req.json()

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({ email, password, email_confirm: true })
  if (authError) return new Response(JSON.stringify({ error: authError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  const { data: userProfile, error: profileError } = await supabase.from("users")
    .insert({ id: authData.user!.id, email, full_name: full_name ?? null, role: role ?? "tenant_user", tenant_id: tenant_id ?? null })
    .select().single()
  if (profileError) return new Response(JSON.stringify({ error: profileError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  return new Response(JSON.stringify({ user: userProfile }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
})