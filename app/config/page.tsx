import { Shell } from "@/components/layout/shell";
import { ConfigHeader } from "@/components/config/header";
import { BentoGrid } from "@/components/config/bento-grid";

export default function ConfigPage() {
  return (
    <Shell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 relative">
        {/* Ambient background glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[380px] bg-[radial-gradient(ellipse_at_top,rgba(100,116,139,0.08),transparent_65%)]" />
        <ConfigHeader
          title="Configuración"
          description="Identidad, ciclos de tarjetas, apariencia y privacidad. Todo en un solo lugar."
        />
        <BentoGrid />
      </div>
    </Shell>
  );
}
