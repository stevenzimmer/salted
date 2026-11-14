import { createClient } from "@sanity/client";
import { isRecord } from "./migrations/navigation";
import { activateSpecialOrderCopy } from "./migrations/activate-special-orders";

async function main() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const token =
    process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN;
  if (!projectId || !token)
    throw new Error("Private migration credentials are required.");
  const client = createClient({
    projectId,
    token,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
    apiVersion: "2026-02-01",
    perspective: "raw",
    useCdn: false,
  });
  const documents = await client.fetch<unknown[]>(
    '*[_type == "specialOrdersPage" && _id in ["specialOrdersPage", "drafts.specialOrdersPage"]]',
  );
  let transaction = client.transaction();
  let count = 0;
  for (const document of documents) {
    if (
      !isRecord(document) ||
      typeof document._id !== "string" ||
      typeof document._rev !== "string"
    )
      throw new Error("Invalid document; no changes committed.");
    const updates = activateSpecialOrderCopy(document);
    if (!updates) continue;
    const { _id, _rev } = document;
    transaction = transaction.patch(_id, (patch) =>
      patch.ifRevisionId(_rev).set(updates),
    );
    count++;
  }
  if (process.argv.includes("--dry-run"))
    console.log(
      `${count} document(s) need special-order activation copy. No changes made.`,
    );
  else if (count) {
    await transaction.commit();
    console.log(
      `Updated ${count} special-order document(s); custom copy and draft status preserved.`,
    );
  } else console.log("Special-order copy is already initialized.");
}
void main().catch(() => {
  console.error(
    "Special-order copy migration failed; check credentials and concurrent edits.",
  );
  process.exitCode = 1;
});
