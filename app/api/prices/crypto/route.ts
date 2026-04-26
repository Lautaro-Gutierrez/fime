import { NextResponse, type NextRequest } from "next/server";
import { getCryptoQuotes } from "@/lib/prices/coingecko";

// GET /api/prices/crypto?symbols=BTC,ETH,SOL
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
    const quotes = await getCryptoQuotes(symbols);
    return NextResponse.json(quotes);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json(
      { error: "crypto_fetch_failed", message },
      { status: 502 },
    );
  }
}
