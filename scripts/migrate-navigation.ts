import { createClient } from "@sanity/client";
import { isRecord, migrateSiteNavigation } from "./migrations/navigation";

async function main() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const token =
    process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN;
  if (!projectId || !token)
    throw new Error(
      "Set a Sanity project ID and a server-only write token to migrate navigation.",
    );
  const client = createClient({
    projectId,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
    apiVersion: "2026-02-01",
    token,
    useCdn: false,
    perspective: "raw",
  });
  const documents = await client.fetch<unknown[]>(
    '*[_id in ["siteSettings", "drafts.siteSettings"]]',
  );
  let transaction = client.transaction();
  let count = 0;
  for (const document of documents) {
    if (
      !isRecord(document) ||
      typeof document._id !== "string" ||
      typeof document._rev !== "string"
    )
      throw new Error("Invalid site settings document; no changes committed.");
    const updates = migrateSiteNavigation(document);
    if (!updates) continue;
    const { _id, _rev } = document;
    transaction = transaction.patch(_id, (patch) =>
      patch.ifRevisionId(_rev).set(updates),
    );
    count++;
  }
  if (process.argv.includes("--dry-run")) {
    console.log(
      `${count} settings document(s) need navigation migration. No changes made.`,
    );
  } else if (count) {
    // Revision guards preserve concurrent edits; the transaction is all-or-nothing.
    await transaction.commit();
    console.log(
      `Migrated ${count} settings document(s), preserving published/draft copy and utility labels.`,
    );
  } else {
    console.log("Navigation is already migrated. No changes made.");
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Navigation migration failed",
  );
  process.exitCode = 1;
});
