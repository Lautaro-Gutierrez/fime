"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Palette,
  Bell,
  CreditCard,
  AlertOctagon,
  Lock,
  LogOut,
  Save,
  Loader2,
  BookOpen,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { usePrefsContext } from "@/components/providers/preferences-provider";
import { useUpdatePreferences } from "@/hooks/use-preferences";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Sub-componentes
import { AvatarPicker } from "@/components/config/perfil/avatar-picker";
import { PasskeySection } from "@/components/config/perfil/passkey-section";
import { AccentPicker } from "@/components/config/personalizacion/accent-picker";
import { ThemePicker } from "@/components/config/personalizacion/theme-picker";
import { DensityPicker } from "@/components/config/personalizacion/density-picker";
import { PushNotificationTile } from "@/components/config/push-notification-tile";
import { CardsList } from "@/components/config/tarjetas/cards-list";

type TabId = "perfil" | "apariencia" | "notificaciones" | "tarjetas" | "soporte" | "danger";

interface TabDef {
  id: TabId;
  label: string;
  icon: typeof User;
}

const TABS: TabDef[] = [
  { id: "perfil", label: "Mi Perfil", icon: User },
  { id: "apariencia", label: "Apariencia", icon: Palette },
  { id: "notificaciones", label: "Notificaciones", icon: Bell },
  { id: "tarjetas", label: "Tarjetas y Bancos", icon: CreditCard },
  { id: "soporte", label: "Soporte y Guías", icon: BookOpen },
  { id: "danger", label: "Zona de Peligro", icon: AlertOctagon },
];

export function ConfiguracionClient() {
  const [activeTab, setActiveTab] = useState<TabId>("perfil");

  return (
    <div className="relative flex flex-col gap-6">
      {/* Header */}
      <div className="mb-2 flex flex-col gap-1">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <span className="size-1.5 rounded-full bg-theme-400" />
          Ajustes
        </span>
        <h1 className="bg-gradient-to-br from-white via-white to-white/60 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl uppercase">
          Configuración
        </h1>
      </div>

      {/* Grid: Sidebar + Panel */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        {/* Sidebar Nav */}
        <nav className="flex w-full flex-row gap-1 overflow-x-auto pb-2 lg:w-64 lg:flex-shrink-0 lg:flex-col lg:overflow-visible lg:pb-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap lg:w-full lg:text-left",
                  isActive
                    ? "bg-white/[0.08] text-white"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
                )}
              >
                <Icon className={cn("size-4", isActive ? "text-fuchsia-400" : "text-slate-400")} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Right Content Panel */}
        <div className="flex-1 rounded-2xl border border-white/[0.06] bg-[#1F2229] p-6 shadow-xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "perfil" && <PerfilTab />}
              {activeTab === "apariencia" && <AparienciaTab />}
              {activeTab === "notificaciones" && <NotificacionesTab />}
              {activeTab === "tarjetas" && <TarjetasTab />}
              {activeTab === "soporte" && <SoporteTab />}
              {activeTab === "danger" && <DangerTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── TAB: PERFIL ─────────────────────────────────────────────
function PerfilTab() {
  const supabase = useMemo(() => createClient(), []);
  const { displayName: currentName, avatarKey } = usePrefsContext();
  const updatePrefs = useUpdatePreferences();

  const [displayName, setDisplayName] = useState(currentName || "");
  const [email, setEmail] = useState("");
  const [nameDirty, setNameDirty] = useState(false);
  const [savingName, setSavingName] = useState(false);

  // Contraseña
  const [showPwChange, setShowPwChange] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // Logout
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email);
    });
  }, [supabase]);

  useEffect(() => {
    if (currentName !== undefined) {
      setDisplayName(currentName || "");
      setNameDirty(false);
    }
  }, [currentName]);

  async function handleSaveName() {
    if (!displayName.trim()) return;
    setSavingName(true);
    try {
      await updatePrefs.mutateAsync({ display_name: displayName.trim() });
      setNameDirty(false);
      toast.success("Nombre actualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSavingName(false);
    }
  }

  async function handlePasswordChange() {
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
      toast.error(err instanceof Error ? err.message : "Error al actualizar");
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
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-white">Mi Perfil</h2>
        <p className="text-xs text-slate-400 mt-1">Gestioná tu identidad, avatar y credenciales.</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Nombre */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Nombre para mostrar
          </Label>
          <div className="flex gap-2">
            <Input
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setNameDirty(e.target.value !== (currentName || ""));
              }}
              placeholder="Tu nombre"
              maxLength={50}
              className="h-11 flex-1 rounded-xl border border-white/[0.06] bg-[#1A1D24] text-white focus-visible:border-fuchsia-500/50"
            />
            {nameDirty && (
              <Button
                onClick={handleSaveName}
                disabled={savingName}
                className="h-11 rounded-xl bg-gradient-to-r from-[#d946ef] to-[#06b6d4] px-4 text-white font-semibold shadow-lg shadow-fuchsia-500/20"
              >
                {savingName ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              </Button>
            )}
          </div>
        </div>

        {/* Email (Readonly) */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Email
          </Label>
          <Input
            value={email}
            readOnly
            className="h-11 rounded-xl border border-white/[0.06] bg-[#1A1D24] text-slate-500 cursor-not-allowed"
          />
        </div>

        {/* Avatar picker */}
        <div className="rounded-xl border border-white/[0.06] bg-[#1A1D24]/30 p-4">
          <AvatarPicker currentKey={avatarKey} />
        </div>

        {/* Contraseña Change */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setShowPwChange(!showPwChange)}
            className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#1A1D24] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-300 transition-all hover:bg-[#1A1D24]/70"
          >
            <Lock className="size-4 text-fuchsia-400" />
            <span className="flex-1 text-left">Cambiar contraseña</span>
            <span className="text-[10px] text-muted-foreground">
              {showPwChange ? "Cancelar" : "→"}
            </span>
          </button>

          {showPwChange && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex flex-col gap-4 overflow-hidden rounded-xl border border-white/[0.06] bg-[#1A1D24]/40 p-4"
            >
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">
                  Nueva contraseña
                </Label>
                <Input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="h-11 rounded-xl border border-white/[0.06] bg-[#1A1D24] text-white focus-visible:border-fuchsia-500/50"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">
                  Confirmar contraseña
                </Label>
                <Input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="Repetir contraseña"
                  className="h-11 rounded-xl border border-white/[0.06] bg-[#1A1D24] text-white focus-visible:border-fuchsia-500/50"
                />
              </div>
              <Button
                onClick={handlePasswordChange}
                disabled={pwLoading || !newPw}
                className="h-11 rounded-xl bg-gradient-to-r from-[#d946ef] to-[#06b6d4] text-white font-semibold shadow-lg shadow-fuchsia-500/20"
              >
                {pwLoading ? <Loader2 className="size-4 animate-spin" /> : "Actualizar contraseña"}
              </Button>
            </motion.div>
          )}
        </div>

        {/* Biometría (Passkeys) */}
        <PasskeySection />

        {/* Cerrar Sesión */}
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={logoutLoading}
            className="h-11 w-full gap-2 rounded-xl border-rose-500/20 bg-rose-500/5 text-rose-300 transition-all hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-200"
          >
            {logoutLoading ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
            Cerrar Sesión
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── TAB: APARIENCIA ──────────────────────────────────────────
function AparienciaTab() {
  const { stealthMode } = usePrefsContext();
  const updatePrefs = useUpdatePreferences();

  async function handleStealthToggle() {
    try {
      await updatePrefs.mutateAsync({ stealth_mode: !stealthMode });
      toast.success(stealthMode ? "Montos visibles" : "Montos ocultos (Privacidad)");
    } catch (err) {
      toast.error("Error al actualizar");
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-white">Preferencias de la App</h2>
        <p className="text-xs text-slate-400 mt-1">Personalizá el tema, acento de color, densidad visual y privacidad.</p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Stealth Mode */}
        <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#1A1D24] p-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-white flex items-center gap-1.5">
              {stealthMode ? <EyeOff className="size-4 text-fuchsia-400" /> : <Eye className="size-4 text-slate-400" />}
              Modo Privacidad
            </span>
            <span className="text-[11px] text-muted-foreground">
              Aplica desenfoque a montos, saldos y porcentajes en toda la app.
            </span>
          </div>

          <button
            type="button"
            onClick={handleStealthToggle}
            className={cn(
              "relative h-6 w-11 rounded-full border transition-all duration-200",
              stealthMode
                ? "border-fuchsia-500/40 bg-fuchsia-500/20"
                : "border-white/[0.08] bg-[#1A1D24]"
            )}
          >
            <motion.div
              animate={{ x: stealthMode ? 20 : 2 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={cn(
                "absolute top-0.5 size-5 rounded-full shadow-sm transition-colors",
                stealthMode
                  ? "bg-fuchsia-400 shadow-fuchsia-500/30"
                  : "bg-muted-foreground/40"
              )}
            />
          </button>
        </div>

        {/* Accent Picker */}
        <div className="rounded-xl border border-white/[0.06] bg-[#1A1D24]/30 p-4">
          <AccentPicker />
        </div>

        {/* Theme Picker */}
        <div className="rounded-xl border border-white/[0.06] bg-[#1A1D24]/30 p-4">
          <ThemePicker />
        </div>

        {/* Density Picker */}
        <div className="rounded-xl border border-white/[0.06] bg-[#1A1D24]/30 p-4">
          <DensityPicker />
        </div>
      </div>
    </div>
  );
}

// ─── TAB: NOTIFICACIONES ──────────────────────────────────────
function NotificacionesTab() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-white">Notificaciones</h2>
        <p className="text-xs text-slate-400 mt-1">Configurá las alertas push para estar al día.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/[0.06]">
        <PushNotificationTile />
      </div>
    </div>
  );
}

// ─── TAB: TARJETAS Y BANCOS ───────────────────────────────────
function TarjetasTab() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-white">Tarjetas y Bancos</h2>
        <p className="text-xs text-slate-400 mt-1">Definí los cierres y vencimientos de tus tarjetas de crédito.</p>
      </div>

      <div className="flex flex-col gap-4">
        <CardsList />
      </div>
    </div>
  );
}

// ─── TAB: SOPORTE Y GUÍAS ────────────────────────────────────
function SoporteTab() {
  const { restartAll } = useOnboarding();

  function handleRestartTours() {
    restartAll();
    toast.success("Tours reactivados. Se mostrarán al visitar cada módulo.");
  }

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-white">Soporte y Guías</h2>
        <p className="text-xs text-slate-400 mt-1">Reactivá las guías interactivas para aprender a usar la plataforma.</p>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#1A1D24] p-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-white flex items-center gap-1.5">
              <BookOpen className="size-4 text-fuchsia-400" />
              Guías Interactivas
            </span>
            <span className="text-[11px] text-muted-foreground">
              Volvé a activar los mini-tours contextuales explicativos.
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRestartTours}
            className="border-white/[0.08] bg-white/[0.04] text-xs font-semibold hover:bg-white/[0.08]"
          >
            Resetear tours
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── TAB: DANGER ZONE ─────────────────────────────────────────
function DangerTab() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const [wiping, setWiping] = useState(false);

  async function handleWipeData() {
    const confirmation = window.confirm(
      "¿Estás seguro de que querés borrar TODOS tus datos financieros (ingresos, gastos, metas, tarjetas)? Esta operación es destructiva y no se puede deshacer."
    );
    if (!confirmation) return;

    setWiping(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // Borramos de todas las tablas asociadas al usuario
      const deletes = [
        supabase.from("expenses").delete().eq("user_id", user.id),
        supabase.from("incomes").delete().eq("user_id", user.id),
        supabase.from("goals").delete().eq("user_id", user.id),
        supabase.from("credit_cards").delete().eq("user_id", user.id),
      ];

      const results = await Promise.all(deletes);
      const errors = results.filter((r) => r.error).map((r) => r.error?.message);

      if (errors.length > 0) {
        throw new Error("Error borrando algunas tablas: " + errors.join(", "));
      }

      // Invalidamos queries para recargar todo limpio
      await queryClient.invalidateQueries();
      toast.success("Datos financieros reseteados con éxito.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al reiniciar datos");
    } finally {
      setWiping(false);
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-white">Peligro y Restablecimiento</h2>
        <p className="text-xs text-slate-400 mt-1">Acciones irreversibles sobre tu cuenta y almacenamiento.</p>
      </div>

      <div className="rounded-xl border border-rose-500/20 bg-[#1A1D24] p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-rose-500 flex items-center gap-1.5">
            <AlertOctagon className="size-4 text-rose-500" />
            Reiniciar todos los datos
          </span>
          <p className="text-xs text-rose-400/80">
            Esto eliminará permanentemente todas tus transacciones de ingresos, gastos, tarjetas de crédito cargadas y objetivos de metas. Tu perfil y preferencias se mantendrán.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleWipeData}
          disabled={wiping}
          variant="outline"
          className="w-fit border-rose-500/20 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
        >
          {wiping ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
          Reiniciar mi base de datos
        </Button>
      </div>
    </div>
  );
}
