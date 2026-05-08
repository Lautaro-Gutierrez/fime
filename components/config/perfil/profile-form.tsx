"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { KeyRound, Loader2, LogOut, Lock, Save } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { usePreferences, useUpdatePreferences } from "@/hooks/use-preferences";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvatarDisplay } from "@/components/config/perfil/boxer-avatar";
import { AvatarPicker } from "@/components/config/perfil/avatar-picker";
import { cn } from "@/lib/utils";

export function ProfileForm() {
  const supabase = useMemo(() => createClient(), []);
  const { data: prefs } = usePreferences();
  const updatePrefs = useUpdatePreferences();

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [nameDirty, setNameDirty] = useState(false);

  // Password change
  const [showPwChange, setShowPwChange] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // Logout
  const [logoutLoading, setLogoutLoading] = useState(false);

  // Load user email
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email);
    });
  }, [supabase]);

  // Sync display name from preferences
  useEffect(() => {
    if (prefs?.display_name != null && !nameDirty) {
      setDisplayName(prefs.display_name);
    }
  }, [prefs, nameDirty]);

  async function saveName() {
    try {
      await updatePrefs.mutateAsync({ display_name: displayName.trim() || null });
      setNameDirty(false);
      toast.success("Nombre actualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  async function changePassword() {
    if (newPw.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }
    setPwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      toast.success("Contraseña actualizada");
      setShowPwChange(false);
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cambiar contraseña");
    } finally {
      setPwLoading(false);
    }
  }

  async function handleLogout() {
    setLogoutLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.href = "/login";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cerrar sesión");
      setLogoutLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Avatar + Name card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-6 backdrop-blur"
      >

        <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <AvatarDisplay avatarKey={prefs?.avatar_url} displayName={displayName} size={96} />

          <div className="flex flex-1 flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Nombre para mostrar
              </Label>
              <div className="flex gap-2">
                <Input
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    setNameDirty(true);
                  }}
                  placeholder="Tu nombre"
                  maxLength={50}
                  className="h-11 flex-1 rounded-xl border-white/5 bg-white/[0.03] backdrop-blur-xl backdrop-blur focus-visible:border-theme-500/30"
                />
                {nameDirty && (
                  <Button
                    size="sm"
                    onClick={saveName}
                    disabled={updatePrefs.isPending}
                    className="h-11 rounded-xl bg-gradient-to-br from-theme-500 to-orange-600 px-4 text-white shadow-lg shadow-theme-500/20"
                  >
                    <Save className="size-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Email
              </Label>
              <Input
                value={email}
                readOnly
                className="h-11 rounded-xl border-white/5 bg-white/[0.03] backdrop-blur-xl text-muted-foreground backdrop-blur"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Avatar picker */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.03 }}
        className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-6 backdrop-blur"
      >
        <div className="relative">
          <AvatarPicker currentKey={prefs?.avatar_url} />
        </div>
      </motion.div>

      {/* Security card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-6 backdrop-blur"
      >
        <div className="relative flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-theme-400" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Seguridad
            </p>
          </div>

          {/* Password change */}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setShowPwChange(!showPwChange)}
              className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl px-4 py-3 text-sm font-medium transition-all hover:border-white/10"
            >
              <Lock className="size-4 text-theme-300" />
              <span className="flex-1 text-left">Cambiar contraseña</span>
              <span className="text-[10px] text-muted-foreground">
                {showPwChange ? "Cancelar" : "→"}
              </span>
            </button>

            {showPwChange && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="flex flex-col gap-3 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-4"
              >
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Nueva contraseña
                  </Label>
                  <Input
                    type="password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    minLength={6}
                    autoComplete="new-password"
                    className="h-11 rounded-xl border-white/5 bg-white/[0.03] backdrop-blur-xl backdrop-blur focus-visible:border-theme-500/30"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Confirmar contraseña
                  </Label>
                  <Input
                    type="password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    autoComplete="new-password"
                    className="h-11 rounded-xl border-white/5 bg-white/[0.03] backdrop-blur-xl backdrop-blur focus-visible:border-theme-500/30"
                  />
                </div>
                <Button
                  onClick={changePassword}
                  disabled={pwLoading || !newPw}
                  className="h-10 rounded-xl bg-gradient-to-br from-theme-500 to-orange-600 text-white shadow-lg shadow-theme-500/20"
                >
                  {pwLoading ? <Loader2 className="size-4 animate-spin" /> : "Actualizar contraseña"}
                </Button>
              </motion.div>
            )}
          </div>

          {/* Passkeys placeholder */}
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.03] backdrop-blur-xl px-4 py-3">
            <KeyRound className="size-4 text-muted-foreground/50" />
            <div className="flex flex-1 flex-col">
              <span className="text-sm font-medium text-muted-foreground/70">Passkeys</span>
              <span className="text-[10px] text-muted-foreground/50">Autenticación biométrica sin contraseña</span>
            </div>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              pronto
            </span>
          </div>
        </div>
      </motion.div>

      {/* Logout */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Button
          variant="outline"
          onClick={handleLogout}
          disabled={logoutLoading}
          className="h-11 w-full rounded-xl border-rose-500/20 bg-rose-500/5 text-rose-300 transition-all hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-200"
        >
          {logoutLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <LogOut className="size-4" />
              Cerrar sesión
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
}
