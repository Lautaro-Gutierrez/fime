import { NextResponse, type NextRequest } from "next/server";
import { getSp500Series } from "@/lib/prices/finnhub";

// GET /api/prices/sp500?from=2026-01-01
// Devuelve cierres diarios del SPY desde `from` hasta hoy.
export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from");

  if (!from || !/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    return NextResponse.json(
      { error: "invalid_from", message: "from debe ser YYYY-MM-DD" },
      { status: 400 },
    );
  }

  try {
    const series = await getSp500Series(from);
    return NextResponse.json(series);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json(
      { error: "sp500_fetch_failed", message },
      { status: 502 },
    );
  }
}
