import { createClient } from "@sanity/client";
import { isRecord } from "./migrations/navigation";
import {
  categoryDocument,
  migrateProductCategory,
  migrateProductFilters,
} from "./migrations/product-filters";

async function main() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const token =
    process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN;
  if (!projectId || !token)
    throw new Error(
      "Set a Sanity project ID and server-only write token to migrate product filters.",
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
    '*[_id in ["commerceCopy", "drafts.commerceCopy"] || _type == "product"]',
  );
  let transaction = client.transaction();
  let count = 0;
  const categories = new Map<string, ReturnType<typeof categoryDocument>>();
  for (const document of documents) {
    if (
      !isRecord(document) ||
      typeof document._id !== "string" ||
      typeof document._rev !== "string"
    )
      throw new Error(
        "Invalid product/commerce document; no changes committed.",
      );
    const updates =
      document._type === "product"
        ? migrateProductCategory(document)
        : migrateProductFilters(document);
    if (!updates) continue;
    for (const category of updates.categories)
      categories.set(category._id, category);
    const { _id, _rev } = document;
    transaction = transaction.patch(_id, (patch) =>
      patch.ifRevisionId(_rev).set(updates.set).unset(updates.unset),
    );
    count++;
  }
  // Create missing category identities in the same atomic transaction.
  // createIfNotExists preserves categories and names editors have already revised.
  for (const category of categories.values())
    transaction = transaction.createIfNotExists(category);
  if (process.argv.includes("--dry-run"))
    console.log(
      `${count} product/commerce document(s) need migration. No changes made.`,
    );
  else if (count) {
    await transaction.commit();
    console.log(
      `Migrated ${count} product/commerce document(s), preserving draft status and unrelated copy.`,
    );
  } else
    console.log(
      "Product categories and filters are already migrated. No changes made.",
    );
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Product filter migration failed",
  );
  process.exitCode = 1;
});
