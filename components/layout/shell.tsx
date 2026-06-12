"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { MobileFab } from "@/components/layout/mobile-fab";
import { OfflineIndicator } from "@/components/ui/offline-indicator";

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
  { href: "/inversiones/all", label: "Inversiones", short: "Invers.", icon: TrendingUp, enabled: true },
  { href: "/ingresos", label: "Ingresos", short: "Ingr.", icon: Wallet, enabled: true },
  { href: "/metas", label: "Metas", short: "Metas", icon: Target, enabled: true },
  { href: "/config", label: "Configuración", short: "Conf.", icon: Settings, enabled: true },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { displayName } = usePrefsContext();

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

  // Initials for avatar
  const initials = (displayName || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex h-screen">
      <OfflineIndicator />

      {/* ═══════ SIDEBAR (desktop) — from prototype line 85 ═══════ */}
      <aside
        id="desktop-sidebar"
        className="hidden md:flex flex-shrink-0 flex-col justify-between"
        style={{ width: 220, background: "#15171E", borderRight: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Top: Logo + Nav */}
        <div>
          <div className="flex items-center gap-3 px-5 pt-6 pb-6 border-b border-transparent">
            {/* Logo directo, sin divs envolventes que arruinen la transparencia */}
            <img 
              src="/willy_logo.png" 
              alt="FiMe Logo" 
              className="w-11 h-11 object-contain drop-shadow-xl"
            />
            {/* Texto de la marca con gradiente */}
            <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-fuchsia-500 to-cyan-400 bg-clip-text text-transparent">
              FiMe
            </span>
          </div>

          {/* Nav */}
          <div className="px-3 mt-1">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold px-3 mb-2">Menú</p>
            <nav className="flex flex-col gap-0.5" id="nav">
              {NAV.map((item) => {
                const isActive = item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href.split("/")[1] ? `/${item.href.split("/")[1]}` : item.href);
                return (
                  <NavLink key={item.href} item={item} active={isActive} />
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom: User + Logout */}
        <div className="px-4 pb-5">
          <div className="border-t border-white/[0.06] pt-4">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: "linear-gradient(135deg, #10b981, #14b8a6)" }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{displayName || "Mi cuenta"}</p>
                <p className="text-[11px] text-slate-500">Mi cuenta</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors w-full px-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* ═══════ MAIN CONTENT — from prototype line 143 ═══════ */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile Header */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between px-4 md:hidden"
             style={{ background: "#15171E", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2">
            {/* Logo directo, sin divs envolventes que arruinen la transparencia */}
            <img 
              src="/willy_logo.png" 
              alt="FiMe Logo" 
              className="w-8 h-8 object-contain drop-shadow-md"
            />
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-fuchsia-500 to-cyan-400 bg-clip-text text-transparent">
              FiMe
            </span>
          </div>
          <Link href="/config" className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/[0.06] transition-colors">
            <Settings className="size-5" />
          </Link>
        </div>

        {/* Content */}
        <main
          className="flex-1 overflow-y-auto pb-20 md:pb-0"
          style={{ background: "#1A1D24" }}
        >
          {children}
        </main>
      </div>

      <MobileFab />

      {/* Bottom tabs (mobile) */}
      <nav
        id="mobile-bottom-nav"
        className="fixed inset-x-0 bottom-0 z-40 flex justify-around px-2 py-2 md:hidden"
        style={{ background: "#15171E", borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        {NAV.filter((n) => ["/", "/gastos", "/ingresos", "/inversiones/all", "/metas"].includes(n.href)).map(
          (item) => {
            const Icon = item.icon;
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href.split("/")[1] ? `/${item.href.split("/")[1]}` : item.href);
            const cls = cn(
              "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] transition-colors",
              active
                ? "text-violet-400"
                : item.enabled
                  ? "text-slate-400 hover:text-slate-300"
                  : "text-slate-600",
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

  const cls = cn(
    "nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left",
    active ? "active text-white" : "text-slate-400",
    !item.enabled && "opacity-40 cursor-not-allowed",
  );

  if (!item.enabled) {
    return (
      <div className={cls}>
        <Icon className="w-[18px] h-[18px] opacity-70" />
        <span>{item.label}</span>
      </div>
    );
  }

  return (
    <Link href={item.href} className={cls}>
      <Icon className="w-[18px] h-[18px] opacity-70" />
      <span>{item.label}</span>
    </Link>
  );
}

