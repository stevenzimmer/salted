import { createClient } from "@sanity/client";
import { isRecord } from "./migrations/navigation";
import { migrateMarketingConsentCopy } from "./migrations/marketing-consent";
async function main() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const token =
    process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN;
  if (!projectId || !token)
    throw new Error(
      "A Sanity project and server-only migration token are required.",
    );
  const client = createClient({
    projectId,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
    apiVersion: "2026-02-01",
    token,
    useCdn: false,
    perspective: "raw",
  });
  const documents = await client.fetch<unknown[]>(
    '*[_type == "commerceCopy" && _id in ["commerceCopy", "drafts.commerceCopy"]]',
  );
  let transaction = client.transaction(),
    count = 0;
  for (const document of documents) {
    if (
      !isRecord(document) ||
      typeof document._id !== "string" ||
      typeof document._rev !== "string"
    )
      throw new Error("Invalid commerce copy document; no changes committed.");
    const updates = migrateMarketingConsentCopy(document);
    if (updates) {
      const { _id, _rev } = document;
      transaction = transaction.patch(_id, (patch) =>
        patch.ifRevisionId(_rev).set(updates),
      );
      count++;
    }
  }
  if (process.argv.includes("--dry-run"))
    console.log(
      `${count} document(s) need the marketing consent copy slot. No changes made.`,
    );
  else if (count) {
    await transaction.commit();
    console.log(
      `Initialized missing marketing consent copy in ${count} document(s); existing content and drafts preserved.`,
    );
  } else
    console.log("Marketing consent copy already initialized; no changes made.");
}
void main().catch(() => {
  console.error(
    "Marketing consent copy migration failed; verify credentials and concurrent editorial changes.",
  );
  process.exitCode = 1;
});
