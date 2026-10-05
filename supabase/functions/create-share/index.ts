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

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const filename = (formData.get("filename") as string) || file?.name || "file";
    const shareToken = (formData.get("share_token") as string) || crypto.randomUUID().replace(/-/g, "");
    const shareCode = (formData.get("share_code") as string) || "DROP-TEMP";
    const deleteToken = (formData.get("delete_token") as string) || crypto.randomUUID().replace(/-/g, "");

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Size limit: 50MB
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return new Response(JSON.stringify({ error: "File exceeds 50MB limit" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const datePath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
    const uniqueId = crypto.randomUUID();
    const storagePath = `${datePath}/${uniqueId}/${filename.replace(/[/\\?%*:|"<>]/g, "_")}`;

    // Upload to private bucket
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("temporary-files")
      .upload(storagePath, fileBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      return new Response(JSON.stringify({ error: "Storage upload failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

    // Insert database record
    const { error: dbError } = await supabase.from("file_shares").insert({
      share_token: shareToken,
      share_code: shareCode,
      delete_token: deleteToken,
      original_filename: filename,
      storage_path: storagePath,
      file_size: file.size,
      mime_type: file.type || "application/octet-stream",
      created_at: now.toISOString(),
      expires_at: expiresAt,
      status: "active",
      download_count: 0,
    });

    if (dbError) {
      // Revert storage upload on db failure
      await supabase.storage.from("temporary-files").remove([storagePath]);
      return new Response(JSON.stringify({ error: "Database creation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        share_token: shareToken,
        share_code: shareCode,
        delete_token: deleteToken,
        expires_at: expiresAt,
        file_size: file.size,
        original_filename: filename,
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
