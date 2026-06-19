const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// Manually parse .env.local
const envPath = path.resolve(__dirname, ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || "";
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

function computeTwr(snapshots) {
  const valid = snapshots.filter((s) => isFinite(s.total_usd) && s.total_usd > 0);
  const sorted = [...valid].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return [];

  const out = [];
  let cumulative = 1;
  let prevTotal = null;

  for (const s of sorted) {
    if (prevTotal === null) {
      out.push({ date: s.date, twr_pct: 0, total_usd: s.total_usd });
      prevTotal = s.total_usd;
      continue;
    }
    const denom = prevTotal;
    let r = 0;
    if (denom > 0) {
      r = (s.total_usd - s.cashflow_usd - denom) / denom;
      cumulative *= 1 + r;
    }
    out.push({ date: s.date, twr_pct: (cumulative - 1) * 100, total_usd: s.total_usd, r_pct: r * 100 });
    prevTotal = s.total_usd;
  }
  return out;
}

async function run() {
  const { data: portfolios } = await supabase.from("portfolios").select("id, name");
  const portMap = {};
  portfolios.forEach((p) => {
    portMap[p.id] = p.name;
  });

  const { data: snapshots } = await supabase
    .from("portfolio_snapshots")
    .select("*")
    .order("date", { ascending: true });

  // Get unique sorted dates
  const uniqueDates = Array.from(new Set(snapshots.map((s) => s.date))).sort();
  const portIds = Array.from(new Set(snapshots.map((s) => s.portfolio_id)));

  console.log("Unique Dates:", uniqueDates);
  console.log("Portfolios with snapshots:", portIds.map(id => portMap[id] || id));

  // Map of portfolio_id -> last_known_value
  const lastKnownValue = {};
  // Map of portfolio_id -> date -> snapshot
  const snapMap = {};
  snapshots.forEach((s) => {
    snapMap[s.portfolio_id] = snapMap[s.portfolio_id] || {};
    snapMap[s.portfolio_id][s.date] = s;
  });

  const aggregatedCarryForward = [];

  for (const date of uniqueDates) {
    let total_usd = 0;
    let cashflow_usd = 0;

    for (const portId of portIds) {
      const snap = snapMap[portId]?.[date];
      if (snap) {
        // If a new portfolio appears, its initial total_usd could create a fake gain
        // if lastKnownValue[portId] was undefined. To prevent this, if lastKnownValue[portId] is undefined,
        // we should treat the first appearance of this portfolio as a cash inflow (cashflow_usd += snap.total_usd).
        // Let's verify this mathematically:
        let isFirstAppearance = lastKnownValue[portId] === undefined;
        
        lastKnownValue[portId] = snap.total_usd;
        total_usd += snap.total_usd;
        
        // Add the cashflow from the snapshot
        cashflow_usd += snap.cashflow_usd;
        
        if (isFirstAppearance) {
          // Treat the initial balance as a cash flow injection on this date so it doesn't count as TWR return
          cashflow_usd += snap.total_usd;
          console.log(`Portfolio ${portMap[portId] || portId} first appeared on ${date} with total_usd = ${snap.total_usd}. Adding to cashflow to prevent fake gain.`);
        }
      } else {
        // Carry forward last known value (if any)
        const lastVal = lastKnownValue[portId] || 0;
        total_usd += lastVal;
        // cashflow is 0 since no new snapshot is recorded for this portfolio on this date
      }
    }

    aggregatedCarryForward.push({
      date,
      total_usd,
      cashflow_usd,
    });
  }

  console.log("\n=== TWR Consolidado 'ALL' (Con Carry-Forward y Ajuste de Apertura) ===");
  const consolidatedTwr = computeTwr(aggregatedCarryForward);
  console.table(consolidatedTwr.map(t => ({
    date: t.date,
    total_usd: t.total_usd,
    r_pct: t.r_pct ? t.r_pct.toFixed(2) + "%" : "0.00%",
    twr_pct: t.twr_pct.toFixed(2) + "%"
  })));
}

run();
