import { spawn } from "node:child_process";
if (
  !process.env.TEST_DATABASE_URL ||
  process.env.TEST_DATABASE_URL === process.env.DATABASE_URL
)
  throw new Error(
    "Configure a separate migrated TEST_DATABASE_URL for unsubscribe UI verification.",
  );
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", "3001"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: process.env.TEST_DATABASE_URL,
      COMMERCE_ENABLED: "false",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3001",
    },
  },
);
process.on("SIGTERM", () => child.kill("SIGTERM"));
process.on("SIGINT", () => child.kill("SIGINT"));
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
