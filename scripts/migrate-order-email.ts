import { createClient } from "@sanity/client";
import { isRecord } from "./migrations/navigation";
import {
  migrateOrderEmailCopy,
  migrateOrderEmailPickup,
} from "./migrations/order-email";

async function main() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const token =
    process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN;
  if (!projectId || !token)
    throw new Error("A project and migration token are required.");
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
      throw new Error("Invalid CMS document.");
    const updates =
      migrateOrderEmailCopy(document) ?? migrateOrderEmailPickup(document);
    if (!updates) continue;
    const { _id, _rev } = document;
    transaction = transaction.patch(_id, (patch) =>
      patch.ifRevisionId(_rev).set(updates),
    );
    count++;
  }
  if (process.argv.includes("--dry-run"))
    console.log(`${count} document(s) need email copy. No changes made.`);
  else if (count) {
    await transaction.commit();
    console.log(
      `Initialized email copy in ${count} document(s); existing copy preserved.`,
    );
  } else console.log("No email copy changes needed.");
}
void main().catch(() => {
  console.error(
    "Email copy migration failed; verify credentials and concurrent editorial changes.",
  );
  process.exitCode = 1;
});
