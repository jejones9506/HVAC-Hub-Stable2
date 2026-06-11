// HVAC Hub - Supabase Edge Function: notify-approval (Step 17 optional)
// Triggered manually or via DB webhook / after updateApprovalStatus.
// Sends push notification to suggester + admins (using Expo push tokens stored in profile or separate table).
// Also can email via Supabase + Resend integration if configured.
// For now: logs + returns payload; real impl would use fetch to Expo push API + store tokens.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { approvalId, status, adminNotes, suggesterId, suggesterToken, isAdminAlert } = await req.json();

    // In real: 
    // 1. Fetch Expo push token from profiles or notifications table for suggesterId
    // 2. If admin alert, notify all admin users' tokens
    // 3. POST to https://exp.host/--/api/v2/push/send with { to: token, title, body, data }
    // 4. Also realtime or in-app via supabase channel

    const message = status === 'approved' 
      ? `Your suggestion (ID ${approvalId}) was approved! It is now in the shared public database. Notes: ${adminNotes || 'None'}`
      : `Your suggestion (ID ${approvalId}) was rejected. Admin notes: ${adminNotes || 'No details'}. You may resubmit with corrections.`;

    console.log(`[notify-approval] ${isAdminAlert ? 'ADMIN ALERT' : 'User notification'}: ${message}`);

    // Placeholder response (client already does local push + in-app; this for remote when deployed)
    return new Response(
      JSON.stringify({
        success: true,
        message: "Notification would be sent via Expo Push (if tokens + real Edge).",
        payload: { approvalId, status, adminNotes, suggesterId },
        note: "Deploy this + store expo_push_token in profiles. Use Supabase webhooks or call from client after approve/reject for real cross-device pushes.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});