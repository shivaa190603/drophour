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

    const now = new Date().toISOString();

    // 1. Find all expired or deleted records where storage has not been purged
    const { data: expiredShares, error: queryError } = await supabase
      .from("file_shares")
      .select("id, storage_path")
      .or(`expires_at.lte.${now},status.eq.deleted`)
      .limit(100);

    if (queryError) {
      return new Response(JSON.stringify({ error: queryError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!expiredShares || expiredShares.length === 0) {
      return new Response(
        JSON.stringify({ message: "No expired files to clean up", cleaned: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const storagePaths = expiredShares.map((item) => item.storage_path).filter(Boolean);
    const ids = expiredShares.map((item) => item.id);

    // 2. Delete physical storage objects via Storage API (as recommended by Supabase docs)
    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("temporary-files")
        .remove(storagePaths);

      if (storageError) {
        console.error("Storage removal error:", storageError);
      }
    }

    // 3. Mark database records as expired or remove them
    const { error: dbUpdateError } = await supabase
      .from("file_shares")
      .update({ status: "expired" })
      .in("id", ids);

    if (dbUpdateError) {
      console.error("DB update error:", dbUpdateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        cleaned: expiredShares.length,
        timestamp: new Date().toISOString(),
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
