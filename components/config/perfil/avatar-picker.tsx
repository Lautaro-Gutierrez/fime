"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { AVATARS, type AvatarDef } from "@/lib/avatars";
import { useUpdatePreferences } from "@/hooks/use-preferences";
import { cn } from "@/lib/utils";

type Props = {
  currentKey: string | null | undefined;
  onSelect?: (key: string) => void;
};

export function AvatarPicker({ currentKey, onSelect }: Props) {
  const updatePrefs = useUpdatePreferences();
  const [selected, setSelected] = useState(currentKey ?? "boxer");
  const [saving, setSaving] = useState(false);

  async function handlePick(avatar: AvatarDef) {
    if (avatar.key === selected && avatar.key === currentKey) return;
    setSelected(avatar.key);
    setSaving(true);

    try {
      await updatePrefs.mutateAsync({ avatar_url: avatar.key });
      onSelect?.(avatar.key);
      toast.success(`Avatar: ${avatar.label}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
      setSelected(currentKey ?? "boxer");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="size-1.5 rounded-full bg-theme-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Avatar
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
        {AVATARS.map((avatar) => {
          const isSelected = avatar.key === selected;
          return (
            <motion.button
              key={avatar.key}
              type="button"
              onClick={() => handlePick(avatar)}
              disabled={saving}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "group relative flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition-all",
                isSelected
                  ? "border-theme-500/50 bg-theme-500/10 shadow-lg shadow-theme-500/10"
                  : "border-white/5 bg-card/40 hover:border-white/15 hover:bg-card/60",
              )}
            >
              {/* Image preview */}
              <div className="relative flex size-12 items-center justify-center">
                <img
                  src={avatar.imageUrl}
                  alt={avatar.label}
                  className={cn(
                    "size-12 rounded-xl object-cover transition-all",
                    isSelected
                      ? "ring-2 ring-theme-500 brightness-110"
                      : "opacity-70 grayscale-[30%] group-hover:opacity-100 group-hover:grayscale-0",
                  )}
                  draggable={false}
                />

                {/* Check overlay */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-theme-500 shadow-lg shadow-theme-500/30"
                    >
                      <Check className="size-2.5 text-black" strokeWidth={3} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-[9px] font-medium transition-colors",
                  isSelected ? "text-theme-300" : "text-muted-foreground/50 group-hover:text-muted-foreground",
                )}
              >
                {avatar.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
