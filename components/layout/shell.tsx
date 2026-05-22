"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import logoImg from "@/app/icon1.png";
import {
  LayoutDashboard,
  Receipt,
  TrendingUp,
  Wallet,
  Target,
  Settings,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usePrefsContext } from "@/components/providers/preferences-provider";
import { AvatarDisplay } from "@/components/config/perfil/boxer-avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { MobileFab } from "@/components/layout/mobile-fab";

type NavItem = {
  href: string;
  label: string;
  short: string;
  icon: LucideIcon;
  enabled: boolean;
};

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", short: "Inicio", icon: LayoutDashboard, enabled: true },
  { href: "/gastos", label: "Gastos", short: "Gastos", icon: Receipt, enabled: true },
  { href: "/inversiones", label: "Inversiones", short: "Invers.", icon: TrendingUp, enabled: true },
  { href: "/ingresos", label: "Ingresos", short: "Ingr.", icon: Wallet, enabled: true },
  { href: "/metas", label: "Metas", short: "Metas", icon: Target, enabled: true },
  { href: "/config", label: "Configuración", short: "Conf.", icon: Settings, enabled: true },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return;
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-svh w-full">
      {/* Sidebar (desktop) */}
      <aside id="desktop-sidebar" className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r border-white/[0.06] bg-white/[0.03] backdrop-blur-xl px-4 py-6 md:flex">
        <Link href="/" className="mb-10 flex items-center gap-3 px-2 group relative">
          <div className="absolute inset-0 bg-theme-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          <Image 
            src={logoImg} 
            alt="FiMe Logo" 
            className="size-9 rounded-lg shadow-sm relative z-10 ring-1 ring-white/10"
          />
          <span className="text-xl font-bold tracking-tight text-white drop-shadow-md relative z-10">FiMe</span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <div key={item.href} className="contents">
              {item.href === "/config" && <div className="my-3 h-px w-full bg-white/[0.06]" />}
              <NavLink item={item} active={pathname === item.href} />
            </div>
          ))}
        </nav>

        {/* User profile */}
        <div className="mb-2 flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl px-3 py-2.5">
          <UserBadge />
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-4" />
          Cerrar sesión
        </button>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile Header */}
        <div className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] bg-white/[0.03] backdrop-blur-xl px-4 md:hidden">
          <Link href="/" className="flex items-center gap-2 group relative">
            <div className="absolute inset-0 bg-theme-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <Image src={logoImg} alt="FiMe" className="size-7 rounded shadow-sm relative z-10 ring-1 ring-white/10" />
            <span className="font-bold tracking-tight text-white drop-shadow-md relative z-10">FiMe</span>
          </Link>
          <Link href="/config" className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-white/5 transition-colors">
            <Settings className="size-5" />
          </Link>
        </div>

        {/* Content */}
        <main className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0 w-full overflow-x-hidden">
          {children}
        </main>
      </div>

      <MobileFab />

      {/* Bottom tabs (mobile) */}
      <nav id="mobile-bottom-nav" className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t bg-white/[0.03] backdrop-blur-xl px-2 py-2 md:hidden">
        {NAV.filter((n) => ["/", "/gastos", "/ingresos", "/inversiones", "/metas"].includes(n.href)).map(
          (item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            const cls = cn(
              "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] transition-colors",
              active
                ? "text-theme-400"
                : item.enabled
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-muted-foreground/40",
            );
            return item.enabled ? (
              <Link key={item.href} href={item.href} className={cls}>
                <Icon className="size-5" />
                {item.short}
              </Link>
            ) : (
              <button key={item.href} disabled className={cls} aria-disabled>
                <Icon className="size-5" />
                {item.short}
              </button>
            );
          },
        )}
      </nav>
    </div>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  const baseCls = cn(
    "group flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-all border-l-[3px] border-transparent",
    active
      ? "bg-white/[0.04] text-theme-400 border-theme-400"
      : item.enabled
        ? "text-muted-foreground hover:bg-white/[0.02] hover:text-foreground"
        : "cursor-not-allowed text-muted-foreground/40",
  );

  if (!item.enabled) {
    return (
      <div className={baseCls}>
        <Icon className="size-4" />
        <span className="flex-1">{item.label}</span>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] uppercase text-muted-foreground/70">
          pronto
        </span>
      </div>
    );
  }

  return (
    <Link href={item.href} className={baseCls}>
      <Icon className="size-4" />
      <span>{item.label}</span>
    </Link>
  );
}

function UserBadge() {
  const { displayName, avatarKey } = usePrefsContext();

  return (
    <>
      <AvatarDisplay
        avatarKey={avatarKey}
        displayName={displayName}
        size={32}
        showInitials={false}
        className="rounded-lg"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-foreground">
          {displayName || "Mi cuenta"}
        </span>
        <span className="text-[10px] text-muted-foreground/60">Plan personal</span>
      </div>
    </>
  );
}
