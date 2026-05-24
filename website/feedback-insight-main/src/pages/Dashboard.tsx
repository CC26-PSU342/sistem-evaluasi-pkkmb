import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { MessageSquare, TrendingUp, Smile, Frown, Meh } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Layout } from "@/components/Layout";
import { SentimentBadge, type Sentiment } from "@/components/SentimentBadge";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
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

const SENTIMENT_COLORS = {
  positive: "hsl(var(--sentiment-positive))",
  negative: "hsl(var(--sentiment-negative))",
  neutral: "hsl(var(--sentiment-neutral))",
};

const Dashboard = () => {
  const [data, setData] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error(error);
      } else {
        setData((data as FeedbackRow[]) || []);
      }
      setLoading(false);
    };
    load();

    // Realtime updates
    const channel = supabase
      .channel("feedback-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feedback" },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const total = data.length;
  const counts = {
    positive: data.filter((d) => d.sentiment === "positive").length,
    negative: data.filter((d) => d.sentiment === "negative").length,
    neutral: data.filter((d) => d.sentiment === "neutral").length,
  };
  const pct = (n: number) => (total ? ((n / total) * 100).toFixed(1) : "0.0");

  const pieData = [
    { name: "Positif", value: counts.positive, key: "positive" as const },
    { name: "Netral", value: counts.neutral, key: "neutral" as const },
    { name: "Negatif", value: counts.negative, key: "negative" as const },
  ].filter((d) => d.value > 0);

  const barData = [
    { name: "Positif", value: counts.positive, key: "positive" as const },
    { name: "Netral", value: counts.neutral, key: "neutral" as const },
    { name: "Negatif", value: counts.negative, key: "negative" as const },
  ];

  const recent = data.slice(0, 10);

  if (loading) {
    return (
      <Layout>
        <div className="container py-10 space-y-6">
          <Skeleton className="h-10 w-72" />
          <div className="grid md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-80" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-10 md:py-12 space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Dashboard Evaluasi</h1>
          <p className="text-muted-foreground">
            Visualisasi hasil analisis sentimen feedback mahasiswa terhadap PKKMB.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Feedback"
            value={total}
            icon={MessageSquare}
            tone="primary"
          />
          <StatCard
            label="Positif"
            value={`${counts.positive} (${pct(counts.positive)}%)`}
            icon={Smile}
            tone="positive"
          />
          <StatCard
            label="Netral"
            value={`${counts.neutral} (${pct(counts.neutral)}%)`}
            icon={Meh}
            tone="neutral"
          />
          <StatCard
            label="Negatif"
            value={`${counts.negative} (${pct(counts.negative)}%)`}
            icon={Frown}
            tone="negative"
          />
        </div>

        {total === 0 ? (
          <Card className="p-12 text-center">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold mb-1">Belum ada data feedback</h3>
            <p className="text-sm text-muted-foreground">
              Data akan muncul di sini setelah mahasiswa mengisi form evaluasi.
            </p>
          </Card>
        ) : (
          <>
            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="p-6 shadow-card">
                <h3 className="font-semibold mb-4">Distribusi Sentimen</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.key} fill={SENTIMENT_COLORS[entry.key]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-6 shadow-card">
                <h3 className="font-semibold mb-4">Jumlah per Sentimen</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" name="Jumlah">
                        {barData.map((entry) => (
                          <Cell key={entry.key} fill={SENTIMENT_COLORS[entry.key]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Recent comments */}
            <Card className="p-6 shadow-card">
              <h3 className="font-semibold mb-4">Komentar Terbaru</h3>
              <div className="space-y-3">
                {recent.map((f) => (
                  <div
                    key={f.id}
                    className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <SentimentBadge sentiment={f.sentiment} />
                      <span className="text-sm font-medium">
                        {f.name || "Anonim"}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{f.prodi}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDistanceToNow(new Date(f.created_at), {
                          addSuffix: true,
                          locale: localeId,
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90">{f.comment}</p>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "positive" | "negative" | "neutral";
}

const StatCard = ({ label, value, icon: Icon, tone }: StatCardProps) => {
  const toneClasses = {
    primary: "bg-accent text-primary",
    positive: "bg-sentiment-positive-bg text-sentiment-positive",
    negative: "bg-sentiment-negative-bg text-sentiment-negative",
    neutral: "bg-sentiment-neutral-bg text-sentiment-neutral",
  };
  return (
    <Card className="p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
            {label}
          </p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
};

export default Dashboard;
