import type { NextConfig } from "next";

import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // Permite que dispositivos en la LAN (celular, tablet) accedan a los assets
  // de /_next/* durante desarrollo. Sin esto, solo localhost puede cargar la app.
  allowedDevOrigins: ["192.168.0.125", "192.168.0.*", "192.168.1.*"],

  // Oculta el indicador flotante de Next.js en dev (solo aplica a `next dev`,
  // en producción nunca se muestra).
  devIndicators: false,
};

export default withSerwist(nextConfig);
