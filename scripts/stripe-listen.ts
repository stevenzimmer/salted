// Official Stripe CLI forwarding; never display the API key or signing secret.
import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
const key = process.env.STRIPE_SECRET_KEY;
if (!key || !/^(sk|rk)_test_/.test(key))
  throw new Error("A test key is required.");
const child = spawn(
  "stripe",
  [
    "listen",
    "--forward-to",
    `localhost:${process.argv[2] ?? "3000"}/api/stripe/webhook`,
    "--events",
    "checkout.session.completed,checkout.session.expired,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,charge.refunded",
  ],
  {
    env: { ...process.env, STRIPE_API_KEY: key },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
function output(value: string) {
  const secret = value.match(/whsec_[A-Za-z0-9]+/)?.[0];
  if (secret) {
    const file = process.argv[3] ?? ".env.local";
    let env = existsSync(file) ? readFileSync(file, "utf8") : "";
    env =
      env.replace(/^STRIPE_WEBHOOK_SECRET=.*\n?/gm, "").trimEnd() +
      `\nSTRIPE_WEBHOOK_SECRET=${secret}\n`;
    writeFileSync(file, env, { mode: 0o600 });
    chmodSync(file, 0o600);
    console.log(
      `Stripe CLI connected. Local webhook signing secret saved privately to ${file}.`,
    );
  }
  const safe = value
    .replace(/(?:sk|rk|pk)_(?:test|live)_[A-Za-z0-9]+/g, "[redacted]")
    .replace(/whsec_[A-Za-z0-9]+/g, "[redacted]");
  if (!secret && safe.trim()) process.stdout.write(`${safe}\n`);
}
// Redact complete lines, including secrets split across stream chunks.
const buffers = { stdout: "", stderr: "" };
function consume(stream: keyof typeof buffers, chunk: Buffer) {
  const lines = (buffers[stream] + chunk.toString()).split(/\r?\n/);
  buffers[stream] = lines.pop() ?? "";
  for (const line of lines) output(line);
}
child.stdout.on("data", (chunk: Buffer) => consume("stdout", chunk));
child.stderr.on("data", (chunk: Buffer) => consume("stderr", chunk));
child.on("error", () => {
  console.error("Could not start the official Stripe CLI.");
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
