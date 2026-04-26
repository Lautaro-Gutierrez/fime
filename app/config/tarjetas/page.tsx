import { Shell } from "@/components/layout/shell";
import { ConfigHeader } from "@/components/config/header";
import { CardsList } from "@/components/config/tarjetas/cards-list";

export default function ConfigTarjetasPage() {
  return (
    <Shell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
        <ConfigHeader
          title="Tarjetas"
          eyebrow="Credit Cards"
          description="Cierres y vencimientos. Cada gasto se agrupa en el mes de pago correcto."
          backHref="/config"
        />
        <CardsList />
      </div>
    </Shell>
  );
}
