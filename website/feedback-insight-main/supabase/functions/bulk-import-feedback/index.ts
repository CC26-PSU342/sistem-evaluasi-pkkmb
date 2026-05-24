import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Row {
  name?: string | null;
  prodi: string;
  comment: string;
  sentiment?: "positive" | "negative" | "neutral" | null;
  confidence?: number | null;
}

async function classify(comment: string, apiKey: string): Promise<{ sentiment: Row["sentiment"]; confidence: number }> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "Anda adalah sistem analisis sentimen Bahasa Indonesia untuk evaluasi PKKMB. Klasifikasikan komentar sebagai positive, negative, atau neutral." },
        { role: "user", content: `Analisis sentimen:\n"${comment}"` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "classify_sentiment",
          parameters: {
            type: "object",
            properties: {
              sentiment: { type: "string", enum: ["positive", "negative", "neutral"] },
              confidence: { type: "number" },
            },
            required: ["sentiment", "confidence"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "classify_sentiment" } },
    }),
  });
  if (!r.ok) throw new Error(`AI ${r.status}`);
  const j = await r.json();
  const args = JSON.parse(j.choices[0].message.tool_calls[0].function.arguments);
  return { sentiment: args.sentiment, confidence: Math.max(0, Math.min(1, Number(args.confidence) || 0)) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verify caller is admin
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Tidak terautentikasi" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) return new Response(JSON.stringify({ error: "Sesi tidak valid" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin");
    if (!roles || roles.length === 0) return new Response(JSON.stringify({ error: "Akses ditolak (bukan admin)" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const rows: Row[] = Array.isArray(body?.rows) ? body.rows : [];
    if (!rows.length) return new Response(JSON.stringify({ error: "Tidak ada baris data" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const errors: { row: number; error: string }[] = [];
    const toInsert: any[] = [];

    // Process with limited concurrency
    const concurrency = 4;
    let idx = 0;
    async function worker() {
      while (idx < rows.length) {
        const i = idx++;
        const r = rows[i];
        try {
          const prodi = (r.prodi || "").trim();
          const comment = (r.comment || "").trim();
          const name = (r.name || "")?.toString().trim() || null;
          if (!prodi || prodi.length < 2 || prodi.length > 100) throw new Error("Prodi tidak valid");
          if (!comment || comment.length < 5 || comment.length > 1000) throw new Error("Komentar tidak valid (5-1000 karakter)");
          let sentiment = r.sentiment;
          let confidence = typeof r.confidence === "number" ? r.confidence : null;
          if (!sentiment || !["positive", "negative", "neutral"].includes(sentiment)) {
            const ai = await classify(comment, LOVABLE_API_KEY);
            sentiment = ai.sentiment;
            confidence = ai.confidence;
          }
          toInsert.push({ name, prodi, comment, sentiment, confidence: confidence ?? 0.8 });
        } catch (e: any) {
          errors.push({ row: i + 1, error: e?.message || "Gagal" });
        }
      }
    }
    await Promise.all(Array.from({ length: concurrency }, worker));

    let inserted = 0;
    if (toInsert.length) {
      // Insert in batches of 100
      for (let i = 0; i < toInsert.length; i += 100) {
        const batch = toInsert.slice(i, i + 100);
        const { error, count } = await admin.from("feedback").insert(batch, { count: "exact" });
        if (error) {
          errors.push({ row: 0, error: `DB: ${error.message}` });
        } else {
          inserted += count ?? batch.length;
        }
      }
    }

    return new Response(JSON.stringify({ inserted, total: rows.length, errors }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("bulk-import error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
