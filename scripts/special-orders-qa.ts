import { spawn } from "node:child_process";
const qa = process.env.TEST_DATABASE_URL;
const app = process.env.DATABASE_URL;
if (
  !qa ||
  !app ||
  new URL(qa).hostname.replace("-pooler.", ".") ===
    new URL(app).hostname.replace("-pooler.", ".")
)
  throw new Error(
    "Configure an isolated QA branch for special-order UI verification.",
  );
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", "3001"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: qa,
      NEXT_PUBLIC_SITE_URL: "http://localhost:3001",
      RESEND_API_KEY: "",
    },
  },
);
process.on("SIGTERM", () => child.kill("SIGTERM"));
process.on("SIGINT", () => child.kill("SIGINT"));
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
