import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { Loader2, Send, ArrowRight, CheckCircle2, Upload, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Layout } from "@/components/Layout";
import { SentimentBadge, type Sentiment } from "@/components/SentimentBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const feedbackSchema = z.object({
  name: z.string().trim().max(100, "Nama maksimal 100 karakter").optional(),
  prodi: z
    .string()
    .trim()
    .min(2, "Prodi/Fakultas wajib diisi")
    .max(100, "Prodi/Fakultas maksimal 100 karakter"),
  comment: z
    .string()
    .trim()
    .min(5, "Komentar minimal 5 karakter")
    .max(1000, "Komentar maksimal 1000 karakter"),
});

interface AnalysisResult {
  sentiment: Sentiment;
  confidence: number;
  reasoning: string;
}

const Feedback = () => {
  const [name, setName] = useState("");
  const [prodi, setProdi] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", sessionData.session.user.id);
      setIsAdmin((roleData || []).some((r) => r.role === "admin"));
    };
    checkAdmin();
  }, []);

  const parseCSV = (text: string): Record<string, string>[] => {
    const rows: string[][] = [];
    let cur: string[] = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') inQuotes = false;
        else field += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ",") { cur.push(field); field = ""; }
        else if (c === "\n" || c === "\r") {
          if (c === "\r" && text[i + 1] === "\n") i++;
          cur.push(field); field = "";
          if (cur.some((x) => x.length)) rows.push(cur);
          cur = [];
        } else field += c;
      }
    }
    if (field.length || cur.length) { cur.push(field); if (cur.some((x) => x.length)) rows.push(cur); }
    if (!rows.length) return [];
    const headers = rows[0].map((h) => h.trim().toLowerCase());
    return rows.slice(1).map((r) => {
      const o: Record<string, string> = {};
      headers.forEach((h, i) => (o[h] = (r[i] ?? "").trim()));
      return o;
    });
  };

  const handleImportFile = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      let parsed: any[] = [];
      if (file.name.toLowerCase().endsWith(".json")) {
        const j = JSON.parse(text);
        parsed = Array.isArray(j) ? j : j.rows || [];
      } else {
        parsed = parseCSV(text);
      }
      const rows = parsed.map((r: any) => ({
        name: r.name || r.nama || null,
        prodi: r.prodi || r.fakultas || r["program studi"] || r["prodi/fakultas"] || "",
        comment: r.comment || r.komentar || r.ulasan || r.feedback || "",
        sentiment: (r.sentiment || r.sentimen || "").toLowerCase() || undefined,
        confidence: r.confidence ? Number(r.confidence) : undefined,
      })).filter((r: any) => r.prodi && r.comment);

      if (!rows.length) {
        toast.error("File tidak berisi data valid. Pastikan ada kolom 'prodi' dan 'comment'.");
        return;
      }

      const SENTIMENT_API_URL = import.meta.env.DEV
        ? "/api-sentiment"
        : (import.meta.env.VITE_SENTIMENT_API_URL || "https://deep-learning-sentiment-production.up.railway.app");

      const LABEL_MAP: Record<string, "positive" | "negative" | "neutral"> = {
        positif: "positive", negatif: "negative", netral: "neutral",
        positive: "positive", negative: "negative", neutral: "neutral",
      };

      const VALID_SENTIMENTS = ["positive", "negative", "neutral"];
      const total = rows.length;
      const errors: { row: number; error: string }[] = [];
      const toInsert: any[] = [];

      toast.info(`Menganalisis ${total} baris... mohon tunggu.`);

      // Proses dengan concurrency 4
      const concurrency = 4;
      let idx = 0;
      const worker = async () => {
        while (idx < total) {
          const i = idx++;
          const r = rows[i];
          try {
            const prodi = (r.prodi || "").trim();
            const comment = (r.comment || "").trim();
            const name = r.name ? String(r.name).trim() || null : null;

            if (!prodi || prodi.length < 2) throw new Error("Prodi tidak valid");
            if (!comment || comment.length < 5) throw new Error("Komentar terlalu pendek");

            let sentiment = r.sentiment && VALID_SENTIMENTS.includes(r.sentiment)
              ? r.sentiment as "positive" | "negative" | "neutral"
              : undefined;
            let confidence = r.confidence ?? undefined;

            if (!sentiment) {
              const aiRes = await fetch(`${SENTIMENT_API_URL}/predict`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "ngrok-skip-browser-warning": "true",
                },
                body: JSON.stringify({ text: comment }),
              });
              if (!aiRes.ok) throw new Error(`Sentiment API ${aiRes.status}`);
              const aiData = await aiRes.json();

              const rawLabel = (aiData.sentimen || aiData.sentiment || "").toString().toLowerCase().trim();
              sentiment = LABEL_MAP[rawLabel];
              if (!sentiment) throw new Error("Respons API sentimen tidak valid");

              const rawConf = aiData.confidence ?? aiData.probabilitas?.[aiData.sentimen];
              confidence = typeof rawConf === "string" && rawConf.includes("%")
                ? parseFloat(rawConf) / 100
                : Number(rawConf) || 0.8;
            }

            toInsert.push({ name, prodi, comment, sentiment, confidence: confidence ?? 0.8 });
          } catch (e: any) {
            errors.push({ row: i + 1, error: e?.message || "Gagal" });
          }
        }
      };

      await Promise.all(Array.from({ length: concurrency }, worker));

      // Insert ke Supabase DB per batch 100
      let inserted = 0;
      const CHUNK = 100;
      const totalChunks = Math.ceil(toInsert.length / CHUNK);
      for (let i = 0; i < toInsert.length; i += CHUNK) {
        const batch = toInsert.slice(i, i + CHUNK);
        const chunkIdx = Math.floor(i / CHUNK) + 1;
        const { error: dbErr, count } = await supabase
          .from("feedback")
          .insert(batch, { count: "exact" });
        if (dbErr) {
          errors.push({ row: 0, error: `DB batch ${chunkIdx}: ${dbErr.message}` });
        } else {
          inserted += count ?? batch.length;
        }
        if (totalChunks > 1) toast.info(`Menyimpan batch ${chunkIdx}/${totalChunks}...`);
      }

      const errCount = errors.length;
      toast.success(`Selesai: ${inserted} baris berhasil diimpor${errCount ? ` (${errCount} gagal)` : ""}.`);
      if (errors.length) console.warn("Import errors:", errors);
    } catch (e: any) {
      toast.error(e?.message || "Gagal membaca file");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = feedbackSchema.safeParse({ name, prodi, comment });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        if (issue.path[0]) fieldErrors[String(issue.path[0])] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      // Langsung panggil API sentimen sendiri
      const SENTIMENT_API_URL = import.meta.env.DEV
        ? "/api-sentiment"
        : (import.meta.env.VITE_SENTIMENT_API_URL || "https://deep-learning-sentiment-production.up.railway.app");

      const aiRes = await fetch(`${SENTIMENT_API_URL}/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ text: comment }),
      });

      if (!aiRes.ok) {
        toast.error(`Gagal menghubungi API sentimen (${aiRes.status}). Coba lagi.`);
        return;
      }

      const aiData = await aiRes.json();

      // API mengembalikan label Indonesia & confidence sebagai string persen
      const LABEL_MAP: Record<string, "positive" | "negative" | "neutral"> = {
        positif: "positive",
        negatif: "negative",
        netral: "neutral",
        positive: "positive",
        negative: "negative",
        neutral: "neutral",
      };

      const REASONING_MAP: Record<string, string> = {
        positive: "Komentar terdeteksi mengandung sentimen positif (pujian, kepuasan, atau pengalaman menyenangkan).",
        negative: "Komentar terdeteksi mengandung sentimen negatif (keluhan, kritik, atau pengalaman buruk).",
        neutral: "Komentar terdeteksi mengandung sentimen netral (saran, observasi, atau campuran).",
      };

      const rawLabel = (aiData.sentimen || aiData.sentiment || "").toString().toLowerCase().trim();
      const sentiment = LABEL_MAP[rawLabel];

      if (!sentiment) {
        toast.error("Format respons API sentimen tidak valid.");
        return;
      }

      const rawConf = aiData.confidence ?? aiData.probabilitas?.[aiData.sentimen];
      const confidence = Math.max(0, Math.min(1,
        typeof rawConf === "string" && rawConf.includes("%")
          ? parseFloat(rawConf) / 100
          : Number(rawConf) || 0
      ));

      // Simpan ke Supabase DB langsung
      const { error: dbError } = await supabase.from("feedback").insert({
        name: name || null,
        prodi,
        comment,
        sentiment,
        confidence,
      });

      if (dbError) {
        toast.error("Gagal menyimpan feedback: " + dbError.message);
        return;
      }

      setResult({ sentiment, confidence, reasoning: REASONING_MAP[sentiment] });
      toast.success("Feedback berhasil dikirim!");
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan. Mohon coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setName("");
    setProdi("");
    setComment("");
    setResult(null);
    setErrors({});
  };

  return (
    <Layout>
      <div className="container py-10 md:py-16 max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Form Evaluasi PKKMB</h1>
          <p className="text-muted-foreground">
            Sampaikan kesan, kritik, dan saran Anda terhadap pelaksanaan PKKMB.
          </p>
        </div>

        {isAdmin && (
          <Card className="p-4 mb-6 shadow-card border-dashed bg-muted/30">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2 shrink-0">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 text-sm space-y-2">
                <p className="font-semibold">Import Data Mentah (Admin)</p>
                <p className="text-muted-foreground">
                  Upload CSV / JSON. Kolom wajib:{" "}
                  <code className="text-xs bg-muted px-1 rounded">prodi</code>,{" "}
                  <code className="text-xs bg-muted px-1 rounded">comment</code>. Opsional:{" "}
                  <code className="text-xs bg-muted px-1 rounded">name</code>,{" "}
                  <code className="text-xs bg-muted px-1 rounded">sentiment</code>,{" "}
                  <code className="text-xs bg-muted px-1 rounded">confidence</code>. Sentiment kosong akan dianalisis AI. Tanpa batas jumlah baris (diproses per batch 300).
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.json,text/csv,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImportFile(f);
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={importing}
                >
                  {importing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {importing ? "Mengimpor..." : "Pilih File"}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {!result ? (
          <Card className="p-6 md:p-8 shadow-card">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nama <span className="text-muted-foreground font-normal">(opsional)</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  maxLength={100}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="prodi">
                  Program Studi / Fakultas <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="prodi"
                  value={prodi}
                  onChange={(e) => setProdi(e.target.value)}
                  placeholder="Contoh: Teknik Informatika"
                  maxLength={100}
                  required
                />
                {errors.prodi && <p className="text-xs text-destructive">{errors.prodi}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">
                  Komentar / Ulasan <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tuliskan kesan, kritik, atau saran Anda mengenai PKKMB..."
                  rows={6}
                  maxLength={1000}
                  required
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{errors.comment && <span className="text-destructive">{errors.comment}</span>}</span>
                  <span>{comment.length}/1000</span>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menganalisis...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Kirim Feedback
                  </>
                )}
              </Button>
            </form>
          </Card>
        ) : (
          <Card className="p-6 md:p-8 shadow-elegant animate-fade-in">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-sentiment-positive-bg mb-3">
                <CheckCircle2 className="h-7 w-7 text-sentiment-positive" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Terima Kasih!</h2>
              <p className="text-muted-foreground">
                Feedback Anda telah dianalisis dan disimpan.
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-5 mb-6 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Hasil Analisis Sentimen
                </p>
                <div className="flex items-center gap-3">
                  <SentimentBadge sentiment={result.sentiment} className="text-sm px-3 py-1.5" />
                  <span className="text-sm text-muted-foreground">
                    Confidence:{" "}
                    <span className="font-semibold text-foreground">
                      {(result.confidence * 100).toFixed(1)}%
                    </span>
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                  Alasan
                </p>
                <p className="text-sm">{result.reasoning}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={reset} variant="outline" className="flex-1">
                Kirim Feedback Lain
              </Button>
              <Button asChild className="flex-1">
                <Link to="/dashboard">
                  Lihat Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Feedback;
