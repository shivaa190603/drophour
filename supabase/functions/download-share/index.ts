import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const shareToken = body.share_token;

    if (!shareToken) {
      return new Response(JSON.stringify({ error: "Missing share token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Query record
    const { data: record, error } = await supabase
      .from("file_shares")
      .select("*")
      .eq("share_token", shareToken)
      .single();

    if (error || !record) {
      return new Response(JSON.stringify({ error: "File not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiration
    const isExpired = new Date(record.expires_at).getTime() <= Date.now() || record.status !== "active";
    if (isExpired) {
      return new Response(JSON.stringify({ error: "This file has expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create 60-second signed URL for private bucket
    const { data: signedData, error: signError } = await supabase.storage
      .from("temporary-files")
      .createSignedUrl(record.storage_path, 60, {
        download: record.original_filename,
      });

    if (signError || !signedData?.signedUrl) {
      return new Response(JSON.stringify({ error: "Failed to generate signed download link" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update download stats
    await supabase
      .from("file_shares")
      .update({
        download_count: (record.download_count || 0) + 1,
        last_downloaded_at: new Date().toISOString(),
      })
      .eq("id", record.id);

    return new Response(
      JSON.stringify({
        download_url: signedData.signedUrl,
        filename: record.original_filename,
        expires_at: record.expires_at,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
