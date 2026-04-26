import type { FxRates } from "./types";

type DolarEntry = {
  casa: string;
  nombre: string;
  compra: number | null;
  venta: number;
  fechaActualizacion: string;
};

// Endpoint público sin API key. Devuelve array con todas las cotizaciones.
// casa: "oficial" | "blue" | "bolsa" (MEP) | "contadoconliqui" (CCL) | "tarjeta" | "cripto" | "mayorista"
const DOLAR_API_URL = "https://dolarapi.com/v1/dolares";

export async function getFxRates(): Promise<FxRates> {
  const res = await fetch(DOLAR_API_URL, {
    next: { revalidate: 300 },
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`dolarapi error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as DolarEntry[];
  const map = Object.fromEntries(data.map((d) => [d.casa, d.venta]));

  return {
    mep: map.bolsa ?? 0,
    ccl: map.contadoconliqui ?? 0,
    blue: map.blue ?? 0,
    oficial: map.oficial ?? 0,
    fetched_at: new Date().toISOString(),
  };
}
