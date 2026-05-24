import { Link } from "react-router-dom";
import { ArrowRight, MessageSquarePlus, Brain, BarChart3, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";

const Index = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-soft border-b">
        <div className="container py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium mb-6">
              <GraduationCap className="h-3.5 w-3.5" />
              Sistem Evaluasi Berbasis AI
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6">
              Evaluasi Kepuasan Mahasiswa terhadap{" "}
              <span className="text-primary">Kegiatan PKKMB</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Proyek ini mengembangkan sistem web untuk analisis sentimen feedback mahasiswa terhadap PKKMB. Dengan NLP dan Machine Learning, sistem mengklasifikasikan kritik dan saran menjadi positif, negatif, atau netral guna mendukung evaluasi kampus yang objektif dan berbasis data.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="shadow-elegant">
                <Link to="/feedback">
                  Isi Form Evaluasi
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/dashboard">Lihat Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container py-16 md:py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Bagaimana Sistem Ini Bekerja?</h2>
          <p className="text-muted-foreground">
            Tiga langkah sederhana untuk menyampaikan evaluasi Anda
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            {
              icon: MessageSquarePlus,
              step: "01",
              title: "Unggah File ",
              desc: "Dosen mengunggah file berupa csv yang berisi feedback mahasiswa mengenai kegiatan PKKMB.",
            },
            {
              icon: Brain,
              step: "02",
              title: "Analisis AI",
              desc: "Sistem AI mengklasifikasikan sentimen komentar: positif, negatif, atau netral.",
            },
            {
              icon: BarChart3,
              step: "03",
              title: "Visualisasi",
              desc: "Hasil ditampilkan dalam dashboard yang mudah dipahami untuk evaluasi panitia.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="relative bg-card rounded-xl border p-6 shadow-card hover:shadow-elegant transition-shadow"
              >
                <div className="absolute -top-3 -right-3 bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full">
                  {item.step}
                </div>
                <div className="h-12 w-12 rounded-lg bg-accent flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-gradient-soft">
        <div className="container py-12 md:py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Siap Mengevaluasi Feedback PKKMB?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Setiap komentar membantu meningkatkan kualitas PKKMB di periode mendatang.
          </p>
          <Button asChild size="lg" className="shadow-elegant">
            <Link to="/feedback">
              Mulai Evaluasi Sekarang
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
