// Seed / reset the demo accounts.   npm run seed
// Also writes the live-demo upload files to ./demo-docs.
import { config } from "dotenv";
config({ path: ".env.local" });
import { mkdirSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { seedAll, demoEmail } from "../lib/seed/run";
import { renderSeedPdf } from "../lib/seed/pdf";
import { LAKSHMI, LIVE_DEMO_DOC } from "../lib/seed/stories";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY, password = process.env.DEMO_PASSWORD;
  if (!url || !key || !password) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DEMO_PASSWORD in .env.local");
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const today = new Date().toISOString().slice(0, 10);

  await seedAll(sb, { password, today, log: (s) => console.log("  ✓", s) });

  mkdirSync("demo-docs", { recursive: true });
  writeFileSync("demo-docs/live-upload-dr-iyer-prescription.pdf", await renderSeedPdf(LAKSHMI, LIVE_DEMO_DOC, today));
  console.log("  ✓ demo-docs/live-upload-dr-iyer-prescription.pdf (upload this live in the demo)");
  console.log(`\nDemo logins (password from DEMO_PASSWORD): ${["lakshmi", "arjun", "dr.iyer", "dr.menon", "citycare"].map(demoEmail).join(", ")}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
