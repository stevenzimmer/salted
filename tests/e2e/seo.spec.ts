import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { money } from "../../src/lib/format";

const canonicalOrigin = "https://saltedfocaccia.com";
const crawler = "OAI-SearchBot";
const apex = { Host: "saltedfocaccia.com", "User-Agent": crawler };
const fixedPages = [
  "/",
  "/about",
  "/pickup",
  "/special-orders",
  "/storage-heating",
  "/recipes",
];

test.beforeEach(async ({ page }) => {
  await page.route(/googletagmanager|google-analytics/, (route) =>
    route.abort(),
  );
});

test("public pages have unique production canonicals, complete social tags and server-rendered search content", async ({
  page,
  request,
}) => {
  const seen = new Set<string>();
  for (const path of [
    ...fixedPages,
    "/products/classic-focaccia",
    "/products/pesto-mozzarella",
    "/products/classic-sourdough",
  ]) {
    const response = await request.get(path, {
      headers: { "User-Agent": crawler },
    });
    expect(response.status(), path).toBe(200);
    expect(response.headers()["x-robots-tag"]).toContain("noindex");
    const html = await response.text();
    const head = html.split("</head>")[0];
    const canonical = head.match(/rel="canonical" href="([^"]+)"/)?.[1];
    expect(canonical && new URL(canonical).href).toBe(canonicalOrigin + path);
    expect(head).toMatch(/name="robots" content="noindex/);
    expect(head).not.toMatch(/[\u200b\u200c\u200d\ufeff]/);
    const title = head.match(/<title>([^<]+)<\/title>/)?.[1];
    expect(title).toContain("Salted Focaccia");
    if (!title) throw new Error(`Missing title for ${path}`);
    expect(seen.has(title)).toBe(false);
    seen.add(title);
    expect(head).toMatch(/name="description" content="[^"]+"/);
    for (const field of [
      "title",
      "description",
      "url",
      "site_name",
      "type",
      "image",
      "image:alt",
      "image:width",
      "image:height",
      "locale",
    ]) {
      expect(head, `${path} og:${field}`).toContain(`property="og:${field}"`);
    }
    for (const field of ["title", "description", "image", "card"]) {
      expect(head, `${path} twitter:${field}`).toContain(
        `name="twitter:${field}"`,
      );
    }
    expect(html).toContain("<main");
    if (path === "/products/classic-focaccia") {
      expect(html).toContain('href="/storage-heating"');
      expect(html).toContain('href="/pickup"');
    }
  }

  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Salted Focaccia" }),
  ).toBeVisible();
  await expect(
    page.locator('a[href="/products/classic-focaccia"]').first(),
  ).toBeVisible();
  const graphs = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  const nodes = graphs.flatMap((item) => JSON.parse(item)["@graph"]);
  expect(nodes.map(({ "@type": type }) => type)).toEqual(
    expect.arrayContaining(["Organization", "WebSite", "WebPage"]),
  );
});

test("size URLs render the selected size and ignore tracking in the canonical", async ({
  page,
}) => {
  const path = "/products/classic-focaccia";
  await page.goto(`${path}?size=square&utm_source=seo-qa`);
  await expect(
    page.locator('.product-detail-copy input[type="radio"][value="square"]'),
  ).toBeChecked();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    canonicalOrigin + path,
  );
  const graphs = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  const group = graphs
    .flatMap((item) => JSON.parse(item)["@graph"])
    .find((item) => item["@type"] === "ProductGroup");
  expect(group).toBeDefined();
  const square = group.hasVariant.find((item: { url: string }) =>
    item.url.endsWith("?size=square"),
  );
  expect(square?.offers?.priceCurrency).toBe("USD");
  await expect(page.locator(".detail-price")).toContainText(
    money(Math.round(Number(square.offers.price) * 100)),
  );
});

test("missing routes return real 404s and private routes cannot be indexed", async ({
  request,
}) => {
  for (const path of [
    "/products/seo-test-missing",
    "/recipes/seo-test-missing",
    "/seo-test-missing",
  ]) {
    for (const agent of [
      crawler,
      "Mozilla/5.0",
      "Googlebot",
      "Bingbot",
      "PerplexityBot",
    ]) {
      const response = await request.get(path, {
        headers: { "User-Agent": agent },
      });
      expect(response.status(), `${path} ${agent}`).toBe(404);
      expect((await response.text()).split("</head>")[0]).not.toContain(
        'rel="canonical"',
      );
    }
  }
  for (const path of [
    "/studio",
    "/order/open",
    "/order/success?session_id=checkout-seo-test",
    "/unsubscribe",
    "/links",
    "/api/commerce/availability",
  ]) {
    const response = await request.get(path, { headers: apex });
    expect(response.status()).toBe(200);
    expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow");
    if (path.startsWith("/order/")) {
      const html = await response.text();
      expect(html).not.toContain("googletagmanager.com");
      expect(html).not.toContain('rel="canonical"');
    }
  }
});

test("only the approved apex exposes indexable HTML and a published sitemap", async ({
  request,
}) => {
  const approved = process.env.SEO_E2E_LAUNCH_APPROVED === "true";
  for (const host of [
    "salted-focaccia.vercel.app",
    "preview.example",
    "localhost",
    "saltedfocaccia.com",
  ]) {
    const headers = { Host: host, "User-Agent": crawler };
    const indexable = approved && host === apex.Host;
    const page = await request.get("/", { headers });
    expect(page.status()).toBe(200);
    const head = (await page.text()).split("</head>")[0];
    const robots = await request.get("/robots.txt", { headers });
    const sitemap = await request.get("/sitemap.xml", { headers });
    const xml = await sitemap.text();
    expect(robots.status()).toBe(200);
    expect(sitemap.status()).toBe(200);
    expect(await robots.text()).toContain("Allow: /");
    const rules = await robots.text();
    expect(rules).toContain("Disallow: /studio");
    if (host === apex.Host) {
      expect(rules).toContain("User-Agent: GPTBot");
      expect(rules).toContain("User-Agent: Google-Extended");
      expect(rules).toMatch(/Disallow: \/\n/);
      expect(rules).not.toContain("User-Agent: OAI-SearchBot");
      expect(rules).not.toContain("User-Agent: PerplexityBot");
    }
    if (indexable) {
      expect(head).toContain('name="robots" content="index, follow"');
      expect(page.headers()["x-robots-tag"]).toBeUndefined();
      expect(await robots.text()).toContain(
        `Sitemap: ${canonicalOrigin}/sitemap.xml`,
      );
      for (const path of [...fixedPages, "/products/classic-focaccia"]) {
        expect(xml).toContain(`<loc>${canonicalOrigin}${path}</loc>`);
      }
      expect(xml).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}/);
      const locations = Array.from(
        xml.matchAll(/<loc>([^<]+)<\/loc>/g),
        (match) => new URL(match[1]),
      );
      await Promise.all(
        locations.map(async (location) => {
          expect(location.origin).toBe(canonicalOrigin);
          expect(location.search).toBe("");
          const entry = await request.get(location.pathname, { headers });
          expect(entry.status(), location.pathname).toBe(200);
          expect((await entry.text()).split("</head>")[0]).not.toContain(
            'name="robots" content="noindex',
          );
        }),
      );
      for (const path of [
        "/studio",
        "/order/",
        "/api/",
        "/unsubscribe",
        "/products/pesto-mozzarella",
        "/recipes/tomato-toast",
      ]) {
        expect(xml).not.toContain(`<loc>${canonicalOrigin}${path}`);
      }
    } else {
      expect(head).toContain('name="robots" content="noindex, nofollow"');
      expect(page.headers()["x-robots-tag"]).toContain("noindex");
      expect(await robots.text()).not.toContain("Sitemap:");
      expect(xml).not.toContain("<loc>");
    }
  }
  const www = await request.get("/pickup", {
    headers: { Host: "www.saltedfocaccia.com" },
    maxRedirects: 0,
  });
  expect(www.status()).toBe(308);
  expect(www.headers().location).toBe(`${canonicalOrigin}/pickup`);
});

test("Draft Mode keeps the published metadata and suppresses structured data", async ({
  request,
  baseURL,
}) => {
  if (
    !baseURL ||
    !["127.0.0.1", "localhost"].includes(new URL(baseURL).hostname)
  ) {
    test.skip(true, "Requires access to the loopback build manifest");
    return;
  }
  const manifest = JSON.parse(
    await readFile(".next/prerender-manifest.json", "utf8"),
  );
  const previewId = manifest.preview.previewModeId;
  expect(typeof previewId).toBe("string");
  const published = await request.get("/about", { headers: apex });
  const draft = await request.get("/about", {
    headers: { ...apex, Cookie: `__prerender_bypass=${previewId}` },
  });
  expect(draft.status()).toBe(200);
  expect(draft.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  const publishedHead = (await published.text()).split("</head>")[0];
  const draftHtml = await draft.text();
  const draftHead = draftHtml.split("</head>")[0];
  expect(draftHead.match(/<title>[^<]+<\/title>/)?.[0]).toBe(
    publishedHead.match(/<title>[^<]+<\/title>/)?.[0],
  );
  expect(draftHead.match(/name="description" content="[^"]+"/)?.[0]).toBe(
    publishedHead.match(/name="description" content="[^"]+"/)?.[0],
  );
  expect(draftHead).toContain('name="robots" content="noindex, nofollow"');
  expect(draftHtml).not.toContain('type="application/ld+json"');
});
