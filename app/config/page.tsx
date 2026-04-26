import { Shell } from "@/components/layout/shell";
import { ConfigHeader } from "@/components/config/header";
import { BentoGrid } from "@/components/config/bento-grid";

export default function ConfigPage() {
  return (
    <Shell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
        <ConfigHeader
          title="Configuración"
          description="Identidad, ciclos de tarjetas, apariencia y privacidad. Todo en un solo lugar."
        />
        <BentoGrid />
      </div>
    </Shell>
  );
}
