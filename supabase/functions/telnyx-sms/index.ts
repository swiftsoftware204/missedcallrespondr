import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

// Telnyx API configuration
const TELNYX_API_KEY = Deno.env.get("TELNYX_API_KEY") ?? ""
const TELNYX_API_BASE = "https://api.telnyx.com/v2"

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const { to, message, tenant_id, lead_id } = await req.json()

    // Validate required fields
    if (!to || !message || !tenant_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, message, tenant_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Get tenant's phone number
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("phone_number")
      .eq("id", tenant_id)
      .single()

    if (tenantError || !tenant?.phone_number) {
      return new Response(
        JSON.stringify({ error: "Tenant phone number not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Send SMS via Telnyx
    const response = await fetch(`${TELNYX_API_BASE}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TELNYX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: tenant.phone_number,
        to: to,
        text: message,
      }),
    })

    const telnyxData = await response.json()

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: telnyxData.errors?.[0]?.detail || "Failed to send SMS" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Log message to database
    const { data: messageLog, error: logError } = await supabase
      .from("messages")
      .insert({
        tenant_id,
        lead_id: lead_id ?? null,
        direction: "outbound",
        body: message,
        status: telnyxData.data?.status || "sent",
        external_id: telnyxData.data?.id,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (logError) {
      console.error("Failed to log message:", logError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: telnyxData.data?.id,
        status: telnyxData.data?.status 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error("Error sending SMS:", error)
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
