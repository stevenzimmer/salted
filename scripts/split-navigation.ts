import { createClient } from "@sanity/client";
import { isRecord } from "./migrations/navigation";
import { separateNavigation } from "./migrations/separate-navigation";

async function main() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const token =
    process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN;
  if (!projectId || !token)
    throw new Error(
      "Set a Sanity project ID and a server-only write token to split navigation.",
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
      throw new Error("Invalid settings document; no changes committed.");
    const updates = separateNavigation(document);
    if (!updates) continue;
    const { _id, _rev } = document;
    transaction = transaction.patch(_id, (patch) =>
      patch.ifRevisionId(_rev).set(updates.set).unset(updates.unset),
    );
    count++;
    console.log(
      `${_id}: header ${updates.set.headerNavigation?.length ?? "preserved"}, footer ${updates.set.footerNavigation?.length ?? "preserved"} item(s).`,
    );
  }
  if (process.argv.includes("--dry-run"))
    console.log(
      `${count} settings document(s) need migration. No changes made.`,
    );
  else if (count) {
    await transaction.commit();
    console.log(
      `Separated navigation in ${count} settings document(s), preserving draft status and unrelated copy.`,
    );
  } else
    console.log(
      "Header and footer navigation are already separate. No changes made.",
    );
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Navigation migration failed",
  );
  process.exitCode = 1;
});
