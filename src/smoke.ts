// Smoke test: run a real scan via the core against prod and print the teaser.
// Usage: node dist/smoke.js [domain]
import { runScan, formatTeaser } from "./scan.js";

const domain = process.argv[2] ?? "vercel.com";

runScan(domain)
  .then((teaser) => {
    console.log("=== teaser (key fields) ===");
    console.log(
      JSON.stringify(
        {
          score: teaser.score,
          brand: teaser.brand,
          top_gap: teaser.top_gap?.title ?? null,
          report_url: teaser.report_url,
          full_report_locked: teaser.full_report?.locked,
        },
        null,
        2,
      ),
    );
    console.log("\n=== formatted ===\n" + formatTeaser(teaser));
  })
  .catch((err) => {
    console.error("smoke failed:", err);
    process.exit(1);
  });
