"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowUpRight,
  CreditCard,
  Eye,
  EyeOff,
  Palette,
  UserCircle2,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { usePrefsContext } from "@/components/providers/preferences-provider";
import { useUpdatePreferences } from "@/hooks/use-preferences";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import { AvatarDisplay } from "@/components/config/perfil/boxer-avatar";
import { PushNotificationTile } from "@/components/config/push-notification-tile";
import { cn } from "@/lib/utils";

type LinkTile = {
  kind: "link";
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  meta?: string;
  span?: "sm" | "md" | "lg";
  id?: string;
};

type ToggleTile = {
  kind: "toggle";
  title: string;
  description: string;
  icon: LucideIcon;
  iconActive?: LucideIcon;
  meta?: string;
  span?: "sm" | "md" | "lg";
  id?: string;
};

type Tile = LinkTile | ToggleTile;

const TILES: Tile[] = [
  {
    kind: "link",
    href: "/config/perfil",
    title: "Perfil y Acceso",
    description: "Identidad, avatar, email y seguridad de tu cuenta.",
    icon: UserCircle2,
    meta: "Identity",
    span: "lg",
  },
  {
    kind: "link",
    href: "/config/tarjetas",
    title: "Ciclos de Facturación",
    description: "Cierres y vencimientos. Linkea cada gasto al mes correcto.",
    icon: CreditCard,
    meta: "Credit Cards",
    span: "md",
    id: "config-cards",
  },
  {
    kind: "link",
    href: "/config/personalizacion",
    title: "Personalización",
    description: "Tema OLED o Deep Gray, densidad compacta o relajada.",
    icon: Palette,
    meta: "Theming",
    span: "md",
    id: "config-theme",
  },
  {
    kind: "toggle",
    title: "Modo Privacidad",
    description:
      "Aplica desenfoque a montos, saldos y porcentajes en toda la app.",
    icon: Eye,
    iconActive: EyeOff,
    meta: "Stealth Mode",
    span: "sm",
  },
];

export function BentoGrid() {
  return (
    <div className="grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {TILES.map((tile, idx) => (
        <TileCard key={tile.title} tile={tile} index={idx} />
      ))}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: TILES.length * 0.05 }}
        className="sm:col-span-2 lg:col-span-1"
      >
        <PushNotificationTile />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: (TILES.length + 1) * 0.05 }}
        className="sm:col-span-2 lg:col-span-1"
      >
        <OnboardingTile />
      </motion.div>
    </div>
  );
}

function OnboardingTile() {
  const { restartAll } = useOnboarding();
  const router = useRouter();

  const handleRestart = () => {
    restartAll();
    router.push("/");
    toast.success("Tours reiniciados con éxito. Redirigiendo al inicio...");
  };

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-5 backdrop-blur">
      <div className="relative flex items-start justify-between">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-theme-500/10 text-theme-300 ring-1 ring-theme-500/20 transition-all group-hover:bg-theme-500/15 group-hover:ring-theme-500/40">
          <BookOpen className="size-5" />
        </div>
      </div>

      <div className="relative mt-auto flex flex-col gap-1.5 pt-6">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-theme-300/70">
          Guía Interactiva
        </span>
        <h3 className="font-heading text-lg font-semibold text-foreground">
          Guías de Inicio
        </h3>
        <p className="text-sm text-muted-foreground">
          Volvé a activar los mini-tours contextuales de cada módulo para repasar las funcionalidades clave de FiMe en tu próxima visita.
        </p>

        <button
          type="button"
          onClick={handleRestart}
          className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-lg bg-theme-500/15 px-3 py-1.5 text-xs font-medium text-theme-300 border border-theme-500/30 transition-all hover:bg-theme-500/25"
        >
          Repetir todas las guías
        </button>
      </div>
    </div>
  );
}

function TileCard({ tile, index }: { tile: Tile; index: number }) {
  const spanCls =
    tile.span === "lg"
      ? "sm:col-span-2 lg:col-span-2 lg:row-span-2"
      : tile.span === "md"
        ? "lg:col-span-1 lg:row-span-1"
        : "sm:col-span-2 lg:col-span-1";

  const inner =
    tile.kind === "link" ? <LinkContent tile={tile} /> : <ToggleContent tile={tile} />;

  return (
    <motion.div
      id={tile.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={cn("relative", spanCls)}
    >
      {tile.kind === "link" ? (
        <Link
          href={tile.href}
          className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-5 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-theme-500/30 hover:bg-white/[0.03] backdrop-blur-xl"
        >
          {inner}
        </Link>
      ) : (
        <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-5 backdrop-blur">
          {inner}
        </div>
      )}
    </motion.div>
  );
}

function LinkContent({ tile }: { tile: LinkTile }) {
  const Icon = tile.icon;
  const { displayName, avatarKey } = usePrefsContext();
  const isProfileTile = tile.span === "lg";

  return (
    <>

      <div className="relative flex items-start justify-between">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-theme-500/10 text-theme-300 ring-1 ring-theme-500/20 transition-all group-hover:bg-theme-500/15 group-hover:ring-theme-500/40">
          <Icon className="size-5" />
        </div>
        <ArrowUpRight className="size-4 text-muted-foreground/50 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-theme-300" />
      </div>

      {isProfileTile && (
        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20 transition-opacity group-hover:opacity-30">
          <AvatarDisplay avatarKey={avatarKey} displayName={displayName} size={140} showInitials={false} />
        </div>
      )}

      <div className="relative mt-auto flex flex-col gap-1.5 pt-6">
        {tile.meta && (
          <span className="text-[9px] font-semibold uppercase tracking-widest text-theme-300/70">
            {tile.meta}
          </span>
        )}
        <h3 className="font-heading text-lg font-semibold text-foreground">
          {tile.title}
        </h3>
        <p className="text-sm text-muted-foreground">{tile.description}</p>
      </div>
    </>
  );
}

function ToggleContent({ tile }: { tile: ToggleTile }) {
  const { stealthMode } = usePrefsContext();
  const updatePrefs = useUpdatePreferences();
  const Icon = stealthMode && tile.iconActive ? tile.iconActive : tile.icon;

  async function handleToggle() {
    try {
      await updatePrefs.mutateAsync({ stealth_mode: !stealthMode });
      toast.success(stealthMode ? "Montos visibles" : "Montos ocultos");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <>

      <div className="relative flex items-start justify-between">
        <div className={cn(
          "flex size-10 items-center justify-center rounded-2xl ring-1 transition-all",
          stealthMode
            ? "bg-theme-500/20 text-theme-300 ring-theme-500/40"
            : "bg-theme-500/10 text-theme-300 ring-theme-500/20",
        )}>
          <Icon className="size-5" />
        </div>
      </div>

      <div className="relative mt-auto flex flex-col gap-1.5 pt-6">
        {tile.meta && (
          <span className="text-[9px] font-semibold uppercase tracking-widest text-theme-300/70">
            {tile.meta}
          </span>
        )}
        <h3 className="font-heading text-lg font-semibold text-foreground">
          {tile.title}
        </h3>
        <p className="text-sm text-muted-foreground">{tile.description}</p>

        {/* Real toggle switch */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={updatePrefs.isPending}
          className="mt-3 inline-flex items-center gap-2"
        >
          <div
            className={cn(
              "relative h-6 w-11 rounded-full border transition-all duration-200",
              stealthMode
                ? "border-theme-500/40 bg-theme-500/20"
                : "border-white/10 bg-white/[0.03] backdrop-blur-xl",
            )}
          >
            <motion.div
              animate={{ x: stealthMode ? 20 : 2 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={cn(
                "absolute top-0.5 size-5 rounded-full shadow-sm transition-colors",
                stealthMode
                  ? "bg-theme-400 shadow-theme-500/30"
                  : "bg-muted-foreground/40",
              )}
            />
          </div>
          <span className={cn(
            "text-xs font-medium transition-colors",
            stealthMode ? "text-theme-300" : "text-muted-foreground/60",
          )}>
            {stealthMode ? "activado" : "desactivado"}
          </span>
        </button>
      </div>
    </>
  );
}
