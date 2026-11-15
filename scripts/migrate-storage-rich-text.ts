import { createClient } from "@sanity/client";
import { isRecord } from "./migrations/navigation";
import { migrateStorageRichText } from "./migrations/storage-rich-text";

async function main() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const token =
    process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN;
  if (!projectId || !token)
    throw new Error("Private migration credentials are required.");
  const client = createClient({
    projectId,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
    apiVersion: "2026-02-01",
    token,
    useCdn: false,
    perspective: "raw",
  });
  const documents = await client.fetch<unknown[]>(
    '*[_type == "storageHeatingPage"]',
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
    const updates = migrateStorageRichText(document);
    if (!updates) continue;
    const { _id, _rev } = document;
    transaction = transaction.patch(_id, (patch) =>
      patch.ifRevisionId(_rev).set(updates),
    );
    count++;
  }
  if (process.argv.includes("--dry-run"))
    console.log(`${count} document(s) need rich text. No changes made.`);
  else if (count) {
    await transaction.commit();
    console.log(
      `Converted storage guide text in ${count} document(s); wording and draft status preserved.`,
    );
  } else console.log("No storage guide changes needed.");
}

void main().catch(() => {
  console.error(
    "Storage rich-text migration failed; check migration credentials and concurrent edits.",
  );
  process.exitCode = 1;
});
