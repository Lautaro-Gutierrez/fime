import { NextResponse, type NextRequest } from "next/server";
import { getArQuotes } from "@/lib/prices/data912";

// GET /api/prices/ar?type=cedear&symbols=AAPL,KO
// type ∈ {cedear, stock_ar, bond_ar}
// symbols opcional; si no viene, devuelve todo lo disponible del endpoint.
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");
  const symbolsParam = req.nextUrl.searchParams.get("symbols") ?? "";

  if (type !== "cedear" && type !== "stock_ar" && type !== "bond_ar" && type !== "on") {
    return NextResponse.json(
      { error: "invalid_type", message: "type debe ser cedear | stock_ar | bond_ar | on" },
      { status: 400 },
    );
  }

  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    const quotes = await getArQuotes(type, symbols);
    return NextResponse.json(quotes);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json(
      { error: "ar_fetch_failed", message },
      { status: 502 },
    );
  }
}
