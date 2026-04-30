import { Construction } from "lucide-react";

type Props = {
  title: string;
  description: string;
};

export function Placeholder({ title, description }: Props) {
  return (
    <div className="relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border border-dashed border-white/10 bg-card/30 p-12 text-center">
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]">
        <div className="size-full bg-[radial-gradient(circle_at_50%_50%,white_1px,transparent_1px)] bg-[length:16px_16px]" />
      </div>
      <div className="relative flex size-12 items-center justify-center rounded-2xl bg-theme-500/10 text-theme-300 ring-1 ring-theme-500/20">
        <Construction className="size-6" />
      </div>
      <h2 className="relative font-heading text-lg font-semibold text-foreground">
        {title}
      </h2>
      <p className="relative max-w-md text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
