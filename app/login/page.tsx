"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Wallet, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bienvenido");
        router.push("/gastos");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success("Cuenta creada. Ya podés iniciar sesión.");
        setMode("login");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
            <Wallet className="size-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">FiMe</h1>
          <p className="text-sm text-muted-foreground">Tus finanzas, claras.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-2xl border bg-card/60 p-6 backdrop-blur"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vos@ejemplo.com"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            size="lg"
            className="mt-2 h-11 w-full"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : mode === "login" ? (
              "Iniciar sesión"
            ) : (
              "Crear cuenta"
            )}
          </Button>

          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {mode === "login"
              ? "¿No tenés cuenta? Crear una"
              : "¿Ya tenés cuenta? Iniciar sesión"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
