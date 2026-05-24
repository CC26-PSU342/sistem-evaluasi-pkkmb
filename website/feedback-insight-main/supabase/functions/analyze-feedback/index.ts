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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY missing");
      return new Response(JSON.stringify({ error: "Konfigurasi AI belum tersedia" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Lovable AI Gateway with structured tool calling
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "Anda adalah sistem analisis sentimen Bahasa Indonesia untuk evaluasi kegiatan PKKMB (Pengenalan Kehidupan Kampus bagi Mahasiswa Baru). Klasifikasikan komentar mahasiswa sebagai 'positive' (positif - menunjukkan kepuasan, pujian, atau pengalaman menyenangkan), 'negative' (negatif - keluhan, kritik, atau pengalaman buruk), atau 'neutral' (netral - saran, observasi tanpa nada emosi jelas, atau campuran). Berikan confidence score 0.00-1.00.",
          },
          {
            role: "user",
            content: `Analisis sentimen komentar evaluasi PKKMB ini:\n\n"${comment}"`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_sentiment",
              description: "Mengklasifikasikan sentimen komentar mahasiswa.",
              parameters: {
                type: "object",
                properties: {
                  sentiment: {
                    type: "string",
                    enum: ["positive", "negative", "neutral"],
                    description: "Klasifikasi sentimen",
                  },
                  confidence: {
                    type: "number",
                    description: "Tingkat keyakinan klasifikasi antara 0 dan 1",
                  },
                  reasoning: {
                    type: "string",
                    description: "Alasan singkat klasifikasi (1 kalimat)",
                  },
                },
                required: ["sentiment", "confidence", "reasoning"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "classify_sentiment" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Terlalu banyak permintaan. Mohon coba lagi sebentar." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Kredit AI habis. Silakan tambahkan kredit di workspace Anda." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "Gagal menganalisis sentimen" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in AI response:", JSON.stringify(aiData));
      return new Response(JSON.stringify({ error: "Format respons AI tidak valid" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const args = JSON.parse(toolCall.function.arguments);
    const sentiment = args.sentiment as "positive" | "negative" | "neutral";
    const confidence = Math.max(0, Math.min(1, Number(args.confidence) || 0));

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
        analysis: { sentiment, confidence, reasoning: args.reasoning },
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
