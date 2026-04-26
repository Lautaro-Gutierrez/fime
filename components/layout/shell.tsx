"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  TrendingUp,
  PieChart,
  Wallet,
  Target,
  Settings,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type NavItem = {
  href: string;
  label: string;
  short: string;
  icon: LucideIcon;
  enabled: boolean;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", short: "Inicio", icon: LayoutDashboard, enabled: false },
  { href: "/gastos", label: "Gastos", short: "Gastos", icon: Receipt, enabled: true },
  { href: "/inversiones", label: "Inversiones", short: "Invers.", icon: TrendingUp, enabled: true },
  { href: "/portfolio", label: "Portfolio", short: "Port.", icon: PieChart, enabled: true },
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
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r bg-card/30 px-3 py-5 md:flex">
        <Link href="/gastos" className="mb-8 flex items-center gap-2 px-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
            <Wallet className="size-4" />
          </div>
          <span className="text-lg font-semibold tracking-tight">FiMe</span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <NavLink key={item.href} item={item} active={pathname === item.href} />
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-4" />
          Cerrar sesión
        </button>
      </aside>

      {/* Content */}
      <main className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        {children}
      </main>

      {/* Bottom tabs (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t bg-card/95 px-2 py-2 backdrop-blur md:hidden">
        {NAV.filter((n) => ["/gastos", "/ingresos", "/inversiones", "/portfolio", "/metas", "/config"].includes(n.href)).map(
          (item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            const cls = cn(
              "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] transition-colors",
              active
                ? "text-emerald-400"
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
    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
    active
      ? "bg-emerald-500/10 text-emerald-400"
      : item.enabled
        ? "text-muted-foreground hover:bg-muted hover:text-foreground"
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
