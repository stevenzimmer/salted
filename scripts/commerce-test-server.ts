import { spawn } from "node:child_process";
if (
  !process.env.TEST_DATABASE_URL ||
  process.env.TEST_DATABASE_URL === process.env.DATABASE_URL
)
  throw new Error("A separate migrated TEST_DATABASE_URL is required.");
if (
  !/^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY ?? "") ||
  !process.env.STRIPE_WEBHOOK_SECRET
)
  throw new Error(
    "Use sandbox Stripe keys and the actual port-3001 CLI signing secret.",
  );
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", "3001"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: process.env.TEST_DATABASE_URL,
      NEXT_PUBLIC_SITE_URL: "http://localhost:3001",
    },
  },
);
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
