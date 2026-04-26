import { NextResponse } from "next/server";
import { getFxRates } from "@/lib/prices/dolarapi";

export async function GET() {
  try {
    const rates = await getFxRates();
    return NextResponse.json(rates);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json(
      { error: "fx_fetch_failed", message },
      { status: 502 },
    );
  }
}
