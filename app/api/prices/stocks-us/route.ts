import { NextResponse, type NextRequest } from "next/server";
import { getStockUsQuotes } from "@/lib/prices/finnhub";

// GET /api/prices/stocks-us?symbols=AAPL,MSFT,SPY
export async function GET(req: NextRequest) {
  const symbolsParam = req.nextUrl.searchParams.get("symbols") ?? "";
  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (symbols.length === 0) {
    return NextResponse.json({});
  }

  try {
    const quotes = await getStockUsQuotes(symbols);
    return NextResponse.json(quotes);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json(
      { error: "stock_us_fetch_failed", message },
      { status: 502 },
    );
  }
}
