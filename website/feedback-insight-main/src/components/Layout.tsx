import { Link, useLocation } from "react-router-dom";
import { GraduationCap, BarChart3, MessageSquarePlus, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { to: "/", label: "Beranda", icon: GraduationCap },
  { to: "/feedback", label: "Beri Feedback", icon: MessageSquarePlus },
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/admin", label: "Admin", icon: Shield },
];

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold text-primary">
            <div className="h-9 w-9 rounded-lg bg-gradient-hero flex items-center justify-center shadow-elegant">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="hidden sm:inline text-sm leading-tight">
              Evaluasi PKKMB
              <span className="block text-xs font-normal text-muted-foreground">
                Analisis Sentimen
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-card mt-auto">
        <div className="container py-6 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">
            Sistem Evaluasi Kepuasan Mahasiswa Terhadap Kegiatan PKKMB
          </p>
          <p>Berbasis Analisis Sentimen · Powered by Team CC26-PSU342</p>
        </div>
      </footer>
    </div>
  );
};
