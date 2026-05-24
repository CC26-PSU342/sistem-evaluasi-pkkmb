import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Loader2, Shield, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DEFAULT_EMAIL = "admin@pkkmb.ac.id";
const DEFAULT_PASSWORD = "Admin#PKKMB2026";

const authSchema = z.object({
  email: z.string().trim().email("Email tidak valid").max(255),
  password: z.string().min(6, "Password minimal 6 karakter").max(100),
});

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/admin");
    });
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = authSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Berhasil masuk!");
    navigate("/admin");
  };

  const fillDefaults = () => {
    setEmail(DEFAULT_EMAIL);
    setPassword(DEFAULT_PASSWORD);
  };

  return (
    <Layout>
      <div className="container py-12 md:py-20 max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero shadow-elegant mb-3">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Login Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Akses panel admin untuk mengelola data feedback.
          </p>
        </div>

        <Card className="p-6 shadow-card">
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signin-email">Email</Label>
              <Input
                id="signin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signin-password">Password</Label>
              <Input
                id="signin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Masuk
            </Button>
          </form>

          <div className="mt-6 rounded-lg border border-dashed bg-muted/40 p-4 text-sm">
            <p className="font-medium mb-2 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              Akun Admin Default
            </p>
            <div className="space-y-1 text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Email:</span>{" "}
                <code className="text-xs bg-background px-1.5 py-0.5 rounded">
                  {DEFAULT_EMAIL}
                </code>
              </p>
              <p>
                <span className="font-medium text-foreground">Password:</span>{" "}
                <code className="text-xs bg-background px-1.5 py-0.5 rounded">
                  {DEFAULT_PASSWORD}
                </code>
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fillDefaults}
              className="mt-3 w-full"
            >
              Isi Otomatis
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Auth;
