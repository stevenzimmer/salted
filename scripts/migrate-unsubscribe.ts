import { createClient } from "@sanity/client";
import { isRecord } from "./migrations/navigation";
import {
  migrateUnsubscribeCopy,
  migrateUnsubscribeNavigation,
} from "./migrations/unsubscribe";
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
    '*[_id in ["commerceCopy","drafts.commerceCopy","siteSettings","drafts.siteSettings"]]',
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
    // Shared CMS navigation must not point older deployments at a missing route.
    if (
      document._type === "siteSettings" &&
      !process.argv.includes("--include-navigation")
    )
      continue;
    const updates =
      document._type === "commerceCopy"
        ? migrateUnsubscribeCopy(document)
        : migrateUnsubscribeNavigation(document);
    if (!updates) continue;
    const { _id, _rev } = document;
    transaction = transaction.patch(_id, (patch) =>
      patch.ifRevisionId(_rev).set(updates),
    );
    count++;
  }
  if (process.argv.includes("--dry-run"))
    console.log(
      `${count} document(s) need unsubscribe copy/navigation. No changes made.`,
    );
  else if (count) {
    await transaction.commit();
    console.log(
      `Initialized unsubscribe copy/navigation in ${count} document(s); existing copy and drafts preserved.`,
    );
  } else console.log("No unsubscribe copy/navigation changes needed.");
}
void main().catch(() => {
  console.error(
    "Unsubscribe copy migration failed; verify migration credentials and concurrent editorial changes.",
  );
  process.exitCode = 1;
});
