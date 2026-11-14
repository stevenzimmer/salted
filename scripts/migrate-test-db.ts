import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { withDatabase } from "../src/db/client";
async function main() {
  const testUrl = process.env.TEST_DATABASE_URL;
  const appUrl = process.env.DATABASE_URL;
  if (!testUrl || !appUrl)
    throw new Error("Separate QA and app URLs are required.");
  const direct = new URL(testUrl);
  direct.hostname = direct.hostname.replace("-pooler.", ".");
  const app = new URL(appUrl);
  app.hostname = app.hostname.replace("-pooler.", ".");
  if (direct.hostname === app.hostname)
    throw new Error("QA must use an isolated branch.");
  await withDatabase(
    (db) => migrate(db, { migrationsFolder: "./drizzle" }),
    direct.href,
  );
  console.log("Isolated QA migrations applied.");
}
void main().catch(() => {
  console.error(
    "QA migration failed; verify isolated branch credentials and connectivity.",
  );
  process.exitCode = 1;
});
