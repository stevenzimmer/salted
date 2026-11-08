import { createClient } from "@sanity/client";
import { isRecord } from "./migrations/navigation";
import { migrateManualMenuCopy } from "./migrations/manual-menu-copy";
async function main() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN;
  if (!projectId || !token)
    throw new Error("A project and private migration token are required.");
  const client = createClient({
    projectId,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
    apiVersion: "2026-02-01",
    token,
    useCdn: false,
    perspective: "raw",
  });
  const documents = await client.fetch<unknown[]>(
    '*[_id in ["commerceCopy","drafts.commerceCopy"]]',
  );
  let transaction = client.transaction(),
    count = 0;
  for (const document of documents) {
    if (
      !isRecord(document) ||
      typeof document._id !== "string" ||
      typeof document._rev !== "string"
    )
      throw new Error("Invalid document; no changes committed.");
    const updates = migrateManualMenuCopy(document);
    if (!updates) continue;
    const { _id, _rev } = document;
    transaction = transaction.patch(_id, (patch) =>
      patch.ifRevisionId(_rev).set(updates),
    );
    count++;
  }
  if (process.argv.includes("--dry-run"))
    console.log(
      `${count} document(s) need the legacy seeded cancellation label updated. No changes made.`,
    );
  else if (count) {
    await transaction.commit();
    console.log(
      `Updated the seeded cancellation label in ${count} document(s); edited/cleared copy and drafts preserved.`,
    );
  } else console.log("No seeded cancellation copy changes needed.");
}
void main().catch(() => {
  console.error(
    "Manual-menu copy migration failed; verify migration credentials and concurrent edits.",
  );
  process.exitCode = 1;
});
