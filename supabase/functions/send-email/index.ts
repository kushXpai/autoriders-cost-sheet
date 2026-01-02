// supabase/functions/send-email/index.ts
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method Not Allowed" }),
        { status: 405, headers: corsHeaders }
      );
    }

    const { to, cc, subject, html } = await req.json();

    if (!Array.isArray(to) || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid fields" }),
        { status: 400, headers: corsHeaders }
      );
    }

    let resendApiKey: string | undefined;
    try {
      resendApiKey = Deno.env.get("RESEND_API_KEY");
    } catch (e) {
      console.error("Env access error:", e);
    }

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not set" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const payload: any = {
      from: "Autoriders <onboarding@resend.dev>",
      to,
      subject,
      html,
    };

    if (Array.isArray(cc) && cc.length > 0) {
      payload.cc = cc;
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await resendResponse.json();

    if (!resendResponse.ok) {
      return new Response(
        JSON.stringify({ error: data }),
        {
          status: resendResponse.status,
          headers: corsHeaders,
        }
      );
    }

    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});