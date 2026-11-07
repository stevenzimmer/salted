import { createClient } from "@sanity/client";
import { isRecord } from "./migrations/navigation";
import { migrateInactiveProductCopy } from "./migrations/inactive-products";

async function main() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const token =
    process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN;
  if (!projectId || !token)
    throw new Error("Set a Sanity project ID and server-only write token.");

  const client = createClient({
    projectId,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
    apiVersion: "2026-02-01",
    token,
    useCdn: false,
    perspective: "raw",
  });
  const documents = await client.fetch<unknown[]>(
    '*[_type == "commerceCopy" && _id in ["commerceCopy", "drafts.commerceCopy"]]',
  );
  let transaction = client.transaction();
  let count = 0;
  for (const document of documents) {
    if (
      !isRecord(document) ||
      typeof document._id !== "string" ||
      typeof document._rev !== "string"
    )
      throw new Error("Invalid commerce copy document; no changes committed.");
    const updates = migrateInactiveProductCopy(document);
    if (!updates) continue;
    const { _id, _rev } = document;
    transaction = transaction.patch(_id, (patch) =>
      patch.ifRevisionId(_rev).set(updates),
    );
    count++;
  }
  if (process.argv.includes("--dry-run"))
    console.log(
      `${count} commerce copy document(s) need migration. No changes made.`,
    );
  else if (count) {
    await transaction.commit();
    console.log(
      `Added inactive product copy to ${count} document(s), preserving unrelated copy and draft status.`,
    );
  } else
    console.log("Inactive product copy is already present. No changes made.");
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : "Inactive product migration failed",
  );
  process.exitCode = 1;
});
