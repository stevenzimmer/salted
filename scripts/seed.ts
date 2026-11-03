import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { createClient } from "@sanity/client";
import { copyFields } from "../src/sanity/schema/copy-fields";

type Value =
  string | number | boolean | null | Value[] | { [key: string]: Value };
type SeedDocument = { _id: string; _type: string; [key: string]: Value };
async function main() {
  const root = process.cwd();
  const input: unknown = JSON.parse(
    await readFile(resolve(root, "scripts/seed/content.json"), "utf8"),
  );
  function isDocument(value: unknown): value is SeedDocument {
    return (
      typeof value === "object" &&
      value !== null &&
      "_id" in value &&
      typeof value._id === "string" &&
      "_type" in value &&
      typeof value._type === "string"
    );
  }
  if (!Array.isArray(input) || !input.every(isDocument))
    throw new Error("Invalid seed document file");
  const documents = input;
  if (new Set(documents.map((doc) => doc._id)).size !== documents.length)
    throw new Error("Duplicate seed document IDs");
  for (const [type, groups] of Object.entries(copyFields)) {
    const document = documents.find((doc) => doc._id === type);
    if (!document) throw new Error(`Missing singleton ${type}`);
    for (const [group, fields] of Object.entries(groups)) {
      const object = document[group];
      if (!object || typeof object !== "object" || Array.isArray(object))
        throw new Error(`Missing group ${type}.${group}`);
      for (const field of Object.keys(object))
        if (!(fields as readonly string[]).includes(field))
          throw new Error(`Unknown copy field ${type}.${group}.${field}`);
    }
  }
  if (process.argv.includes("--dry-run")) {
    console.log(
      `Validated ${documents.length} documents. No API requests or writes made.`,
    );
  } else {
    const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
    const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
    const token =
      process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN;
    if (!projectId || !token)
      throw new Error(
        "Set NEXT_PUBLIC_SANITY_PROJECT_ID and a temporary SANITY_API_WRITE_TOKEN in .env.local. Never use a write token in the frontend.",
      );
    const client = createClient({
      projectId,
      dataset,
      token,
      apiVersion: "2026-02-01",
      useCdn: false,
      perspective: "raw",
    });
    const existing = new Set(
      await client.fetch<string[]>("*[_id in $ids]._id", {
        ids: documents.flatMap((doc) => [doc._id, `drafts.${doc._id}`]),
      }),
    );
    const pending = documents.filter(
      (doc) => !existing.has(doc._id) && !existing.has(`drafts.${doc._id}`),
    );
    const assetCache = new Map<string, string>();
    async function migrate(value: Value): Promise<Value> {
      if (Array.isArray(value)) return Promise.all(value.map(migrate));
      if (value === null || typeof value !== "object") return value;
      if (
        value._type === "imageWithAlt" &&
        typeof value.migrationSource === "string"
      ) {
        const { migrationSource, ...image } = value;
        if (
          process.argv.includes("--skip-placeholder-images") &&
          migrationSource.startsWith("https://placehold.co/")
        )
          return null;
        let assetId = assetCache.get(migrationSource);
        if (!assetId) {
          let bytes: Buffer;
          if (migrationSource.startsWith("/images/")) {
            const publicRoot = resolve(root, "public");
            const file = resolve(publicRoot, migrationSource.slice(1));
            if (!file.startsWith(publicRoot + sep))
              throw new Error("Invalid local image path");
            bytes = await readFile(file);
          } else {
            const url = new URL(migrationSource);
            if (url.protocol !== "https:" || url.hostname !== "placehold.co")
              throw new Error("Unexpected migration image host");
            const response = await fetch(url, {
              signal: AbortSignal.timeout(30000),
            });
            if (!response.ok)
              throw new Error(
                `Image import failed (${response.status}). Rerun or explicitly use --skip-placeholder-images; existing content will be preserved.`,
              );
            bytes = Buffer.from(await response.arrayBuffer());
          }
          const asset = await client.assets.upload("image", bytes);
          assetId = asset._id;
          assetCache.set(migrationSource, assetId);
        }
        return { ...image, asset: { _type: "reference", _ref: assetId } };
      }
      const entries = await Promise.all(
        Object.entries(value).map(
          async ([key, child]) => [key, await migrate(child)] as const,
        ),
      );
      return Object.fromEntries(entries);
    }
    const migrated: SeedDocument[] = [];
    for (const doc of pending) {
      const result = await migrate(doc);
      if (!isDocument(result)) throw new Error("Invalid migrated document");
      migrated.push(result);
    }
    // References are created atomically. Existing documents and editor drafts are
    // never overwritten; asset uploads are content-addressed by Sanity.
    if (migrated.length) {
      let transaction = client.transaction();
      for (const doc of migrated)
        transaction = transaction.createIfNotExists(doc);
      await transaction.commit();
    }
    console.log(
      `Created ${migrated.length} documents; preserved ${documents.length - pending.length} existing documents; imported ${assetCache.size} distinct images.`,
    );
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Seed failed");
  process.exitCode = 1;
});
