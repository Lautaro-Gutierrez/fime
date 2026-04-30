/**
 * Catálogo de avatares profesionales para el perfil de usuario.
 * Cada avatar tiene un key único, un label para display,
 * y una imageUrl que apunta al archivo .png en /public/avatars/.
 *
 * Se guarda el `key` en user_preferences.avatar_url.
 */

export type AvatarDef = {
  key: string;
  label: string;
  emoji: string; // fallback para alt/aria
  imageUrl: string;
};

export const AVATARS: AvatarDef[] = [
  {
    key: "boxer",
    label: "Boxer",
    emoji: "🥊",
    imageUrl: "/avatars/guantes.png",
  },
  {
    key: "wolf",
    label: "Lobo",
    emoji: "🐺",
    imageUrl: "/avatars/lobo.png",
  },
  {
    key: "eagle",
    label: "Águila",
    emoji: "🦅",
    imageUrl: "/avatars/aguila.png",
  },
  {
    key: "bear",
    label: "Oso",
    emoji: "🐻",
    imageUrl: "/avatars/oso.png",
  },
  {
    key: "lion",
    label: "León",
    emoji: "🦁",
    imageUrl: "/avatars/leon.png",
  },
  {
    key: "moon",
    label: "Luna",
    emoji: "🌙",
    imageUrl: "/avatars/luna.png",
  },
  {
    key: "bolt",
    label: "Rayo",
    emoji: "⚡",
    imageUrl: "/avatars/rayo.png",
  },
  {
    key: "flame",
    label: "Llama",
    emoji: "🔥",
    imageUrl: "/avatars/llama.png",
  },
  {
    key: "diamond",
    label: "Diamante",
    emoji: "💎",
    imageUrl: "/avatars/diamante.png",
  },
  {
    key: "target",
    label: "Objetivo",
    emoji: "🎯",
    imageUrl: "/avatars/objetivo.png",
  },
  {
    key: "mountain",
    label: "Montaña",
    emoji: "🏔️",
    imageUrl: "/avatars/montana.png",
  },
  {
    key: "wave",
    label: "Ola",
    emoji: "🌊",
    imageUrl: "/avatars/ola.png",
  },
  {
    key: "rocket",
    label: "Cohete",
    emoji: "🚀",
    imageUrl: "/avatars/cohete.png",
  },
  {
    key: "swords",
    label: "Espadas",
    emoji: "⚔️",
    imageUrl: "/avatars/espadas.png",
  },
  {
    key: "mask",
    label: "Máscara",
    emoji: "🎭",
    imageUrl: "/avatars/mascara.png",
  },
  {
    key: "crown",
    label: "Corona",
    emoji: "👑",
    imageUrl: "/avatars/corona.png",
  },
];

export const DEFAULT_AVATAR_KEY = "boxer";

export function getAvatarByKey(key: string | null | undefined): AvatarDef {
  if (!key) return AVATARS[0];
  return AVATARS.find((a) => a.key === key) ?? AVATARS[0];
}
