import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

// Telnyx webhook handler for incoming SMS and call events
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const payload = await req.json()
    const eventType = payload.data?.event_type
    const eventData = payload.data?.payload

    // Handle incoming SMS
    if (eventType === "message.received") {
      const from = eventData.from?.phone_number
      const to = eventData.to?.[0]?.phone_number
      const text = eventData.text
      const messageId = eventData.id

      // Find tenant by phone number
      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .select("id")
        .eq("phone_number", to)
        .single()

      if (tenantError || !tenant) {
        console.error("Tenant not found for phone number:", to)
        return new Response("OK", { status: 200 })
      }

      // Find or create lead by phone number
      let leadId = null
      const { data: existingLead, error: leadError } = await supabase
        .from("leads")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("phone", from)
        .single()

      if (existingLead) {
        leadId = existingLead.id
      } else {
        // Create new lead
        const { data: newLead, error: createError } = await supabase
          .from("leads")
          .insert({
            tenant_id: tenant.id,
            phone: from,
            source: "sms_reply",
            status: "new",
          })
          .select()
          .single()

        if (!createError && newLead) {
          leadId = newLead.id
        }
      }

      // Log incoming message
      await supabase.from("messages").insert({
        tenant_id: tenant.id,
        lead_id: leadId,
        direction: "inbound",
        body: text,
        status: "received",
        external_id: messageId,
        from_number: from,
        to_number: to,
        received_at: new Date().toISOString(),
      })

      // Update lead's last contact
      if (leadId) {
        await supabase
          .from("leads")
          .update({ last_contact_at: new Date().toISOString() })
          .eq("id", leadId)
      }
    }

    // Handle call events (missed call detection)
    if (eventType === "call.hangup") {
      const callData = eventData
      const toNumber = callData.to
      const fromNumber = callData.from
      const hangupCause = callData.hangup_cause
      const duration = callData.duration

      // Check if call was missed (no answer, busy, etc.)
      const missedCauses = ["NO_ANSWER", "BUSY", "USER_BUSY", "NO_USER_RESPONSE"]
      
      if (missedCauses.includes(hangupCause) || duration === 0) {
        // Find tenant
        const { data: tenant } = await supabase
          .from("tenants")
          .select("id, settings")
          .eq("phone_number", toNumber)
          .single()

        if (tenant) {
          // Log missed call
          const { data: callLog } = await supabase
            .from("calls")
            .insert({
              tenant_id: tenant.id,
              from_number: fromNumber,
              to_number: toNumber,
              direction: "inbound",
              status: "missed",
              duration: 0,
              created_at: new Date().toISOString(),
            })
            .select()
            .single()

          // Trigger auto-SMS if enabled
          const settings = tenant.settings || {}
          if (settings.auto_sms_enabled !== false) {
            // Queue SMS for sending (handled by separate function)
            await supabase.from("sms_queue").insert({
              tenant_id: tenant.id,
              to_number: fromNumber,
              template: settings.missed_call_template || "default",
              status: "pending",
              call_id: callLog?.id,
            })
          }
        }
      }
    }

    return new Response("OK", { status: 200 })

  } catch (error) {
    console.error("Webhook error:", error)
    return new Response("OK", { status: 200 }) // Always return 200 to Telnyx
  }
})
