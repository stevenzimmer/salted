import Image from "next/image";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { cache } from "react";
import { Text } from "@/components/cms/text";
import { navigationHref } from "@/lib/navigation";
import { hasItems, hasText } from "@/sanity/lib/content";
import { fetchContent } from "@/sanity/lib/fetch-content";
import { contentMetadata } from "@/sanity/lib/metadata";
import { LINKS_QUERY } from "@/sanity/lib/queries";

const getLinksPage = cache(() => fetchContent(LINKS_QUERY));

export async function generateMetadata() {
  return contentMetadata((await getLinksPage())?.seo, "/links");
}

export default async function LinksPage() {
  const page = await getLinksPage();
  const links = hasItems(page?.links)
    ? page.links.flatMap((item) => {
        const href = navigationHref(item?.href);
        return hasText(item?.label) && href
          ? [
              {
                key: item._key,
                label: item.label,
                href,
                newTab: item.openInNewTab === true,
              },
            ]
          : [];
      })
    : [];

  return (
    <main className="min-h-svh border-t-4 border-primary px-6 pt-[clamp(3.5rem,11svh,7rem)] pb-12 sm:px-8">
      <div className="mx-auto max-w-sm">
        <h1 className="mx-auto w-[min(76%,17rem)]">
          <Image
            src="/images/brand/hero-wordmark.svg"
            alt="Salted Focaccia"
            width={2555}
            height={771}
            loading="eager"
            className="h-auto w-full"
          />
        </h1>
        <Text
          value={page?.intro?.blurb}
          className="mx-auto mt-5 max-w-[28ch] text-center text-base leading-relaxed text-pretty wrap-anywhere italic sm:text-lg"
        />
        {links.length > 0 ? (
          <nav aria-label="Salted Focaccia links" className="mt-9">
            <ul className="grid gap-3">
              {links.map(({ key, label, href, newTab }) => {
                const Arrow = newTab ? ArrowUpRight : ArrowRight;
                return (
                  <li key={key}>
                    <a
                      href={href}
                      target={newTab ? "_blank" : undefined}
                      rel={newTab ? "noopener noreferrer" : undefined}
                      className="flex min-h-16 items-center justify-between gap-4 border border-primary bg-accent/30 px-4 py-3 font-heading text-xl leading-tight font-semibold hover:bg-accent focus-visible:bg-accent sm:px-5"
                    >
                      <span className="wrap-anywhere">{label}</span>
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-background text-primary">
                        <Arrow size={19} aria-hidden="true" />
                      </span>
                      {newTab ? (
                        <span className="sr-only"> (opens in a new tab)</span>
                      ) : null}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : null}
      </div>
    </main>
  );
}
