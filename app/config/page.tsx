import { Shell } from "@/components/layout/shell";
import { ConfiguracionClient } from "./configuracion-client";

export default function ConfigPage() {
  return (
    <Shell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 relative">
        <ConfiguracionClient />
      </div>
    </Shell>
  );
}
