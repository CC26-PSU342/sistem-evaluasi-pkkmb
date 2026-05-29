import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FeedbackPayload {
  name?: string;
  prodi: string;
  comment: string;
}

const SENTIMENT_LABELS: Record<string, string> = {
  positive: "Komentar terdeteksi mengandung sentimen positif (pujian, kepuasan, atau pengalaman menyenangkan).",
  negative: "Komentar terdeteksi mengandung sentimen negatif (keluhan, kritik, atau pengalaman buruk).",
  neutral: "Komentar terdeteksi mengandung sentimen netral (saran, observasi, atau campuran).",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: FeedbackPayload = await req.json();
    const name = body.name?.trim() || null;
    const prodi = body.prodi?.trim();
    const comment = body.comment?.trim();

    // Validate
    if (!prodi || prodi.length < 2 || prodi.length > 100) {
      return new Response(
        JSON.stringify({ error: "Prodi/Fakultas wajib diisi (2-100 karakter)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!comment || comment.length < 5 || comment.length > 1000) {
      return new Response(
        JSON.stringify({ error: "Komentar harus 5-1000 karakter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (name && name.length > 100) {
      return new Response(
        JSON.stringify({ error: "Nama maksimal 100 karakter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use custom Sentiment Analysis API
    const SENTIMENT_API_URL = Deno.env.get("SENTIMENT_API_URL") || "https://deep-learning-sentiment-production.up.railway.app";

    const aiResponse = await fetch(`${SENTIMENT_API_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: comment }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Terlalu banyak permintaan. Mohon coba lagi sebentar." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("Sentiment API error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "Gagal menganalisis sentimen" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();

    // API mengembalikan label dalam Bahasa Indonesia dan confidence sebagai string persen
    const LABEL_MAP: Record<string, "positive" | "negative" | "neutral"> = {
      positif: "positive",
      negatif: "negative",
      netral: "neutral",
      // fallback untuk label bahasa Inggris
      positive: "positive",
      negative: "negative",
      neutral: "neutral",
    };

    const rawSentiment = (aiData.sentimen || aiData.sentiment || "").toString().toLowerCase().trim();
    const sentiment = LABEL_MAP[rawSentiment];

    // Confidence bisa berupa string '78.78%' atau angka 0.7878
    const rawConfidence = aiData.confidence ?? aiData.probabilitas?.[aiData.sentimen];
    const confidence = Math.max(0, Math.min(1,
      typeof rawConfidence === "string" && rawConfidence.includes("%")
        ? parseFloat(rawConfidence) / 100
        : Number(rawConfidence) || 0
    ));

    if (!sentiment) {
      console.error("Invalid sentiment from API:", JSON.stringify(aiData));
      return new Response(JSON.stringify({ error: "Format respons API sentimen tidak valid" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate reasoning automatically
    const reasoning = SENTIMENT_LABELS[sentiment] || "Sentimen berhasil dianalisis.";

    // Save to DB using service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data, error } = await supabase
      .from("feedback")
      .insert({
        name,
        prodi,
        comment,
        sentiment,
        confidence,
      })
      .select()
      .single();

    if (error) {
      console.error("DB insert error:", error);
      return new Response(JSON.stringify({ error: "Gagal menyimpan feedback" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        feedback: data,
        analysis: { sentiment, confidence, reasoning },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("analyze-feedback error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Terjadi kesalahan" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
