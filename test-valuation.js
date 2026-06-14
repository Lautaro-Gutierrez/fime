const DOLAR_API_URL = "https://dolarapi.com/v1/dolares";
const DATA912_CEDEARS = "https://data912.com/live/arg_cedears";

async function run() {
  try {
    // 1. Fetch Dolar API
    const res1 = await fetch(DOLAR_API_URL);
    const data1 = await res1.json();
    const map = Object.fromEntries(data1.map((d) => [d.casa, d.venta]));
    const fxCcl = map.contadoconliqui ?? 0;
    console.log("CCL Rate:", fxCcl);

    // 2. Fetch NVDA from data912
    const res2 = await fetch(DATA912_CEDEARS);
    const data2 = await res2.json();
    const nvda = data2.find(x => x.symbol === "NVDA");
    const nvdaPriceArs = nvda ? nvda.c : 0;
    console.log("NVDA price ARS:", nvdaPriceArs);

    if (fxCcl > 0) {
      const priceUsd = nvdaPriceArs / fxCcl;
      console.log("NVDA price USD per CEDEAR:", priceUsd);

      // User has 100 shares at original ratio 24
      // Let's compute value without adjustment:
      const qtyOriginal = 100;
      const valueOriginal = qtyOriginal * priceUsd;
      console.log("Value WITHOUT adjustment:", valueOriginal);

      // Let's compute value WITH adjustment (factor = 240 / 24 = 10)
      const qtyAdjusted = 100 * 10;
      const valueAdjusted = qtyAdjusted * priceUsd;
      console.log("Value WITH adjustment:", valueAdjusted);
    }
  } catch (err) {
    console.error(err);
  }
}
run();
