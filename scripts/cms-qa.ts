// Opt-in integration QA against the configured dataset. Only temporary draft
// fixtures are changed. No payment, order, email, or inventory writes exist.
import { createClient } from "@sanity/client";
import { createPreviewSecret } from "@sanity/preview-url-secret/create-secret";
import { mkdir, writeFile, rm } from "node:fs/promises";
const id = "phase2-cms-qa-product";
const secretId = "sanity-preview-url-secret.salted-phase2-qa";
const label = "Phase 2 automated QA fixture (temporary)";
async function main() {
  const token =
    process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN;
  if (!token || !process.env.NEXT_PUBLIC_SANITY_PROJECT_ID)
    throw new Error("Set a server-only migration token and project ID.");
  const client = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
    apiVersion: "2026-02-01",
    useCdn: false,
    token,
    perspective: "raw",
  });
  const action = process.argv[2] || "check";
  const existing = await client.getDocument(`drafts.${id}`);
  if (existing && existing.internalName !== label)
    throw new Error("QA identity is occupied; no changes made.");
  if (action === "check") {
    const counts = await client.fetch<Record<string, number>>(
      '{"products":count(*[_type=="product" && !(_id in path("drafts.**"))]),"recipes":count(*[_type=="recipe" && !(_id in path("drafts.**"))]),"reviews":count(*[_type=="review" && !(_id in path("drafts.**"))])}',
    );
    console.log(counts);
    return;
  }
  if (action === "prepare") {
    const image = await client.fetch(
      '*[_type=="product" && defined(image.asset)][0].image',
    );
    await client.createOrReplace({
      _id: `drafts.${id}`,
      _type: "product",
      internalName: label,
      id,
      slug: { _type: "slug", current: "phase2-cms-qa" },
      category: { _type: "reference", _ref: "product-category-focaccia" },
      tier: "classic",
      active: true,
      displayOrder: 999,
      displayName: "QA product heading",
      eyebrow: "QA eyebrow",
      badge: "QA badge",
      shortDescription: "QA short paragraph",
      description: "QA full paragraph",
      image,
      ingredients: ["QA ingredient"],
      allergens: ["QA allergen"],
      dietaryLabels: ["QA label"],
      variants: [
        {
          _key: "round",
          _type: "productVariant",
          id: "round",
          active: true,
          label: "QA size",
          shortLabel: "QA size",
          price: 800,
        },
      ],
    });
    const { secret } = await createPreviewSecret(
      client,
      "Salted Phase 2 QA",
      "http://localhost:3000/studio",
      undefined,
      secretId,
    );
    const url = new URL("http://localhost:3000/api/draft-mode/enable");
    url.searchParams.set("sanity-preview-secret", secret);
    url.searchParams.set("sanity-preview-perspective", "drafts");
    url.searchParams.set("sanity-preview-pathname", "/products/phase2-cms-qa");
    await mkdir(".playwright-mcp", { recursive: true });
    await writeFile(".playwright-mcp/cms-preview-url.txt", url.href, {
      mode: 0o600,
    });
    console.log(
      "Created isolated draft fixture and a short-lived preview session URL (gitignored).",
    );
    return;
  }
  if (action === "clear") {
    if (!existing) throw new Error("Run prepare first.");
    await client
      .patch(`drafts.${id}`)
      .set({
        displayName: " ",
        eyebrow: " ",
        badge: " ",
        shortDescription: " ",
        description: " ",
        ingredients: [],
        allergens: [],
        dietaryLabels: [],
        variants: [],
        gallery: [],
        relatedRecipes: [],
        relatedProducts: [],
      })
      .unset(["image"])
      .commit();
    console.log("Cleared optional product content in the isolated draft.");
    return;
  }
  if (action === "long") {
    if (!existing) throw new Error("Run prepare first.");
    await client
      .patch(`drafts.${id}`)
      .set({
        displayName:
          "A long editorial product heading for checking wrapping and narrow screens ".repeat(
            4,
          ),
        shortDescription:
          "A longer paragraph to check the approved responsive layout. ".repeat(
            20,
          ),
      })
      .commit();
    console.log("Applied long copy to the isolated draft.");
    return;
  }
  if (action === "cleanup") {
    await client.delete(`drafts.${id}`);
    await client.delete(`drafts.${secretId}`);
    await rm(".playwright-mcp/cms-preview-url.txt", { force: true });
    console.log("Removed only the temporary QA draft and preview session.");
    return;
  }
  throw new Error("Use check, prepare, clear, long, or cleanup.");
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "CMS QA failed");
  process.exitCode = 1;
});
