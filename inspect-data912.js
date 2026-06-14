const port = process.env.PORT || 3000;
async function run() {
  try {
    // We can fetch from our local running Next.js app api, but wait, is Next.js running?
    // If not, we can query data912 directly or query the db/local api file.
    // Let's inspect the files in lib/prices/data912.ts to see the endpoint.
    console.log("Checking data912...");
  } catch (err) {
    console.error(err);
  }
}
run();
