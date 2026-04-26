import { Shell } from "@/components/layout/shell";
import { ConfigHeader } from "@/components/config/header";
import { Placeholder } from "@/components/config/placeholder";

export default function ConfigPerfilPage() {
  return (
    <Shell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
        <ConfigHeader
          title="Perfil"
          eyebrow="Identity"
          description="Tu identidad en FiMe. Avatar, nombre, email y seguridad."
          backHref="/config"
        />
        <Placeholder
          title="Próximamente"
          description="Avatar Boxer, gestión de email/password y placeholder de Passkeys."
        />
      </div>
    </Shell>
  );
}
