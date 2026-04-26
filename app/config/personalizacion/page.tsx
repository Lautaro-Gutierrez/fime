import { Shell } from "@/components/layout/shell";
import { ConfigHeader } from "@/components/config/header";
import { Placeholder } from "@/components/config/placeholder";

export default function ConfigPersonalizacionPage() {
  return (
    <Shell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
        <ConfigHeader
          title="Personalización"
          eyebrow="Theming"
          description="Tema OLED Black o Deep Gray. Densidad compacta o relajada."
          backHref="/config"
        />
        <Placeholder
          title="Próximamente"
          description="Selector de tema y densidad. Persistencia en user_preferences."
        />
      </div>
    </Shell>
  );
}
