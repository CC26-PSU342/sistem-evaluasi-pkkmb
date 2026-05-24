import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, LogOut, Search, Trash2, Loader2, AlertTriangle } from "lucide-react";
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
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
            <p className="text-sm text-muted-foreground mb-4">
              Akun Anda tidak memiliki hak akses admin.
            </p>
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="mr-2 h-4 w-4" />
              Keluar
            </Button>
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
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="mr-2 h-4 w-4" />
              Keluar
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
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
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
                        <p className="truncate" title={f.comment}>
                          {f.comment}
                        </p>
                      </TableCell>
                      <TableCell>
                        <SentimentBadge sentiment={f.sentiment} />
                      </TableCell>
                      <TableCell>{(f.confidence * 100).toFixed(0)}%</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(f.created_at), "dd MMM yyyy, HH:mm", { locale: localeId })}
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
    </Layout>
  );
};

export default Admin;
