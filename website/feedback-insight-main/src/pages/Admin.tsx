import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Search, Trash2, Loader2, AlertTriangle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Layout } from "@/components/Layout";
import { SentimentBadge, type Sentiment } from "@/components/SentimentBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface FeedbackRow {
  id: string;
  name: string | null;
  prodi: string;
  comment: string;
  sentiment: Sentiment;
  confidence: number;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [data, setData] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSentiment, setFilterSentiment] = useState<string>("all");
  const [filterProdi, setFilterProdi] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [detailRow, setDetailRow] = useState<FeedbackRow | null>(null);



  useEffect(() => {
    const init = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        navigate("/auth");
        return;
      }
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", sessionData.session.user.id);
      const admin = (roleData || []).some((r) => r.role === "admin");
      setIsAdmin(admin);
      setAuthChecked(true);

      if (!admin) {
        toast.error("Akses ditolak. Anda bukan admin.");
        return;
      }
      load();
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!session) navigate("/auth");
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
    } else {
      setData((data as FeedbackRow[]) || []);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("feedback").delete().eq("id", deleteId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Feedback dihapus");
      setData((d) => d.filter((x) => x.id !== deleteId));
    }
    setDeleteId(null);
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    const { error } = await supabase
      .from("feedback")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Seluruh data feedback berhasil dihapus");
      setData([]);
    }
    setDeletingAll(false);
    setShowDeleteAll(false);
  };



  const prodiList = useMemo(
    () => Array.from(new Set(data.map((d) => d.prodi))).sort(),
    [data]
  );

  const filtered = useMemo(() => {
    return data.filter((d) => {
      if (filterSentiment !== "all" && d.sentiment !== filterSentiment) return false;
      if (filterProdi !== "all" && d.prodi !== filterProdi) return false;
      if (search && !d.comment.toLowerCase().includes(search.toLowerCase()) &&
        !(d.name || "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [data, filterSentiment, filterProdi, search]);

  const exportCSV = () => {
    const header = ["Nama", "Prodi", "Komentar", "Sentimen", "Confidence", "Tanggal"];
    const escape = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const rows = filtered.map((f) => [
      escape(f.name || ""),
      escape(f.prodi),
      escape(f.comment),
      escape(f.sentiment),
      f.confidence.toString(),
      escape(format(new Date(f.created_at), "yyyy-MM-dd HH:mm")),
    ]);
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feedback-pkkmb-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Data diekspor ke CSV");
  };

  const [generating, setGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState<string | null>(null);
  const [showGeneratedDialog, setShowGeneratedDialog] = useState(false);
  const [isApiUnavailable, setIsApiUnavailable] = useState(false);

  const extractGeneratedText = (data: any) => {
    if (!data) return "";
    if (typeof data === "string") return data;
    if (data["hasil\ninferensi"]) return data["hasil\ninferensi"];
    if (data.hasOwnProperty("hasil_inferensi")) return data["hasil_inferensi"];
    if (data.result) return data.result;
    if (data.text) return data.text;
    for (const key of Object.keys(data || {})) {
      if (key.replace(/[^a-zA-Z]/g, "").toLowerCase().includes("hasilinferensi")) {
        return data[key];
      }
    }
    return JSON.stringify(data, null, 2);
  };

  const isInferenceResponse = (data: any) => {
    if (!data) return false;
    if (typeof data === "string") {
      return !/^\s*<\/?(html|!doctype)/i.test(data);
    }
    if (data["hasil\ninferensi"] || data.hasOwnProperty("hasil_inferensi") || data.result || data.text) return true;
    return Object.keys(data || {}).some((key) => key.replace(/[^a-zA-Z]/g, "").toLowerCase().includes("hasilinferensi"));
  };

  const postToAi = async (url: string, payload: any) => {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify(payload),
    });
    if (res.status === 405) {
      const sep = url.includes("?") ? "&" : "?";
      const getUrl = url.replace(/\/$/, "") + sep + "reviews_text=" + encodeURIComponent(payload.reviews_text || "");
      return fetch(getUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "ngrok-skip-browser-warning": "true",
        },
      });
    }
    return res;
  };

  const fetchGenerativeAI = async (aiUrl: string, payload: any) => {
    const normalizedUrl = aiUrl.replace(/\/$/, "");
    let res = await postToAi(normalizedUrl, payload);
    let text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (res.ok && !isInferenceResponse(data) && !normalizedUrl.endsWith("/api/summarize")) {
      const summaryUrl = normalizedUrl + "/api/summarize";
      const summaryRes = await postToAi(summaryUrl, payload);
      if (summaryRes.ok) {
        const summaryText = await summaryRes.text();
        try {
          return JSON.parse(summaryText);
        } catch {
          return summaryText;
        }
      }
    }

    if (!res.ok) {
      const summaryUrl = normalizedUrl + "/api/summarize";
      if (!normalizedUrl.endsWith("/api/summarize")) {
        const summaryRes = await postToAi(summaryUrl, payload);
        if (summaryRes.ok) {
          const summaryText = await summaryRes.text();
          try {
            return JSON.parse(summaryText);
          } catch {
            return summaryText;
          }
        }
      }
      throw new Error(`Server error: ${res.status}`);
    }

    return data;
  };

  const handleGenerateSaran = async (row: FeedbackRow) => {
    setGenerating(true);
    const payload = { reviews_text: row.comment };

    // === Prioritas 1: Colab API (VITE_GENERATIVE_AI_URL) ===
    const aiUrl = (import.meta.env.VITE_GENERATIVE_AI_URL as string || "").trim();
    if (aiUrl) {
      try {
        const data = await fetchGenerativeAI(aiUrl, payload);
        const text = extractGeneratedText(data);
        setGeneratedText(text);
        setShowGeneratedDialog(true);
        toast.success("Saran berhasil dibuat dari API");
        setGenerating(false);
        return;
      } catch (colabErr: any) {
        console.warn("Colab API gagal:", colabErr?.message || colabErr);
      }
    }

    // === Prioritas 2: Gemini API langsung (VITE_GEMINI_API_KEY) ===
    const geminiApiKey = (import.meta.env.VITE_GEMINI_API_KEY as string || "").trim();
    if (geminiApiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `Sebagai sistem evaluasi PKKMB, berikan saran konstruktif atau rekomendasi perbaikan berdasarkan komentar mahasiswa berikut ini: "${row.comment}". Berikan tanggapan yang ringkas dan profesional.`
                }]
              }]
            })
          }
        );
        if (!response.ok) throw new Error(`Gemini API: ${response.status} ${response.statusText}`);
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Tidak ada saran yang dihasilkan.";
        setGeneratedText(text);
        setShowGeneratedDialog(true);
        toast.success("Saran berhasil dibuat (via Gemini API)");
        setGenerating(false);
        return;
      } catch (geminiErr: any) {
        console.warn("Gemini API gagal:", geminiErr?.message || geminiErr);
      }
    }

    // === Prioritas 3: Proxy lokal ===
    try {
      const apiBase = (import.meta.env.VITE_API_BASE_URL as string || "http://localhost:3000").trim();
      const proxyUrl = apiBase.replace(/\/$/, "") + "/api/generate-saran/proxy";
      const proxyRes = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (proxyRes.ok) {
        const proxyTextRaw = await proxyRes.text();
        let proxyData: any;
        try { proxyData = JSON.parse(proxyTextRaw); } catch { proxyData = proxyTextRaw; }
        setGeneratedText(extractGeneratedText(proxyData));
        setShowGeneratedDialog(true);
        toast.success("Saran siap ditampilkan (via proxy)");
        setGenerating(false);
        return;
      }
    } catch (proxyErr: any) {
      console.warn("Proxy gagal:", proxyErr?.message || proxyErr);
    }

    // === Fallback: semua sumber tidak tersedia ===
    setIsApiUnavailable(true);
    setGeneratedText(null);
    setShowGeneratedDialog(true);
    toast.info("Generative API belum aktif");
    setGenerating(false);
  };

  const downloadGenerated = () => {
    if (!generatedText) return;
    const blob = new Blob([generatedText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `saran-generated.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Saran diunduh");
  };



  if (!authChecked) {
    return (
      <Layout>
        <div className="container py-20 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="container py-20 max-w-md text-center">
          <Card className="p-8">
            <h2 className="text-xl font-bold mb-2">Akses Ditolak</h2>
            <p className="text-sm text-muted-foreground">
              Akun Anda tidak memiliki hak akses admin.
            </p>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-10 md:py-12 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-1">Panel Admin</h1>
            <p className="text-muted-foreground">
              Kelola seluruh data feedback evaluasi PKKMB.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportCSV} variant="outline" disabled={!filtered.length}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button
              onClick={() => setShowDeleteAll(true)}
              variant="destructive"
              disabled={!data.length}
              id="delete-all-btn"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus Semua Data
            </Button>
          </div>
        </div>

        <Card className="p-4 shadow-card">
          <div className="grid md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari komentar atau nama..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterSentiment} onValueChange={setFilterSentiment}>
              <SelectTrigger>
                <SelectValue placeholder="Filter sentimen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Sentimen</SelectItem>
                <SelectItem value="positive">Positif</SelectItem>
                <SelectItem value="neutral">Netral</SelectItem>
                <SelectItem value="negative">Negatif</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterProdi} onValueChange={setFilterProdi}>
              <SelectTrigger>
                <SelectValue placeholder="Filter prodi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Prodi</SelectItem>
                {prodiList.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card className="shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Prodi</TableHead>
                  <TableHead className="min-w-[300px]">Komentar</TableHead>
                  <TableHead>Sentimen</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-center">Generate Saran</TableHead>
                  <TableHead className="text-right">Hapus</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      Tidak ada data feedback.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">
                        {f.name || <span className="text-muted-foreground italic">Anonim</span>}
                      </TableCell>
                      <TableCell>{f.prodi}</TableCell>
                      <TableCell className="max-w-md">
                        <button
                          type="button"
                          className="flex items-center gap-1.5 text-left group w-full"
                          onClick={() => setDetailRow(f)}
                        >
                          <p className="truncate flex-1">
                            {f.comment}
                          </p>
                          <Eye className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </button>
                      </TableCell>
                      <TableCell>
                        <SentimentBadge sentiment={f.sentiment} />
                      </TableCell>
                      <TableCell>{(f.confidence * 100).toFixed(0)}%</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(f.created_at), "dd MMM yyyy, HH:mm", { locale: localeId })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerateSaran(f)}
                          disabled={generating}
                        >
                          {generating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Menghasilkan...
                            </>
                          ) : (
                            "Generate Saran"
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteId(f.id)}
                          aria-label="Hapus"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        <p className="text-sm text-muted-foreground text-center">
          Menampilkan {filtered.length} dari {data.length} feedback
        </p>
      </div>

      <AlertDialog open={!!detailRow} onOpenChange={(o) => !o && setDetailRow(null)}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Detail Komentar</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span><strong>Nama:</strong> {detailRow?.name || "Anonim"}</span>
                  <span><strong>Prodi:</strong> {detailRow?.prodi}</span>
                  <span><strong>Sentimen:</strong> {detailRow?.sentiment}</span>
                  <span><strong>Tanggal:</strong> {detailRow ? format(new Date(detailRow.created_at), "dd MMM yyyy, HH:mm", { locale: localeId }) : ""}</span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-4 pb-2">
            <div className="rounded-lg bg-muted/50 p-4 max-h-72 overflow-y-auto">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{detailRow?.comment}</p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Tutup</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus feedback ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data feedback akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteAll} onOpenChange={(o) => !o && setShowDeleteAll(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Hapus seluruh data feedback?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>Perhatian:</strong> Tindakan ini akan menghapus{" "}
              <strong>{data.length}</strong> data feedback secara permanen dan tidak
              dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAll}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingAll}
            >
              {deletingAll ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                "Ya, Hapus Semua"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showGeneratedDialog}
        onOpenChange={(o) => {
          if (!o) {
            setShowGeneratedDialog(false);
            setIsApiUnavailable(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isApiUnavailable ? "Generative AI Belum Aktif" : "Hasil Generate Saran"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isApiUnavailable
                ? "Server Generative AI belum dijalankan. Jalankan API di Colab terlebih dahulu lalu coba lagi."
                : "Berikut adalah ringkasan dan rekomendasi yang dihasilkan oleh AI."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {isApiUnavailable ? (
            <div className="p-4 flex flex-col items-center gap-3 text-center">
              <div className="rounded-full bg-yellow-100 dark:bg-yellow-900/30 p-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">
                Pastikan notebook Colab sudah dijalankan dan URL pada <code className="bg-muted px-1 rounded text-xs">VITE_GENERATIVE_AI_URL</code> sudah benar.
              </p>
            </div>
          ) : (
            <div className="p-4">
              <pre className="whitespace-pre-wrap text-sm max-h-64 overflow-auto">{generatedText}</pre>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowGeneratedDialog(false); setIsApiUnavailable(false); }}>Tutup</AlertDialogCancel>
            {!isApiUnavailable && (
              <AlertDialogAction onClick={downloadGenerated} className="bg-primary text-primary-foreground">
                Unduh
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Admin;
