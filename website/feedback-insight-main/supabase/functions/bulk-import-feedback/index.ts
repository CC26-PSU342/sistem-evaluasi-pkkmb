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

async function classify(comment: string, apiUrl: string): Promise<{ sentiment: Row["sentiment"]; confidence: number }> {
  const r = await fetch(`${apiUrl}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: comment }),
  });
  if (!r.ok) throw new Error(`Sentiment API ${r.status}`);
  const data = await r.json();

  // API mengembalikan label dalam Bahasa Indonesia dan confidence sebagai string persen
  const LABEL_MAP: Record<string, "positive" | "negative" | "neutral"> = {
    positif: "positive",
    negatif: "negative",
    netral: "neutral",
    positive: "positive",
    negative: "negative",
    neutral: "neutral",
  };

  const rawSentiment = (data.sentimen || data.sentiment || "").toString().toLowerCase().trim();
  const sentiment = LABEL_MAP[rawSentiment];
  if (!sentiment) throw new Error("Format respons API sentimen tidak valid");

  // Confidence bisa berupa string '78.78%' atau angka 0.7878
  const rawConfidence = data.confidence ?? data.probabilitas?.[data.sentimen];
  const confidence = Math.max(0, Math.min(1,
    typeof rawConfidence === "string" && rawConfidence.includes("%")
      ? parseFloat(rawConfidence) / 100
      : Number(rawConfidence) || 0
  ));

  return { sentiment, confidence };
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

    const SENTIMENT_API_URL = Deno.env.get("SENTIMENT_API_URL") || "https://shininess-yeah-ignore.ngrok-free.dev";

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
            const ai = await classify(comment, SENTIMENT_API_URL);
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
