import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { PageIntro } from "@/components/content/page-intro";
import { Text } from "@/components/cms/text";
import { hasCopy, hasText } from "@/sanity/lib/content";
import { fetchContent } from "@/sanity/lib/fetch-content";
import { PICKUP_QUERY } from "@/sanity/lib/queries";
import { contentMetadata } from "@/sanity/lib/metadata";
export async function generateMetadata() {
  return contentMetadata((await fetchContent(PICKUP_QUERY))?.seo, "/pickup");
}
export default async function PickupPage() {
  const page = await fetchContent(PICKUP_QUERY);
  if (!page) return null;
  if (![page.intro, page.when, page.where, page.policies].some(hasCopy))
    return null;
  const { when, where, policies: p } = page;
  const policies = [
    [p?.addressTitle, p?.addressBody],
    [p?.missedTitle, p?.missedBody],
    [p?.cancellationTitle, p?.cancellationBody],
    [p?.refundTitle, p?.refundBody],
  ].filter((pair) => pair.some(hasText));
  return (
    <div className="shell pb-24">
      <PageIntro {...page.intro} />
      {hasCopy(when) || hasCopy(where) ? (
        <div
          className={`pickup-info-grid ${!hasCopy(when) || !hasCopy(where) ? "cms-single-column" : ""}`}
        >
          {hasCopy(when) ? (
            <section className="pickup-info-card">
              <Text className="eyebrow" value={when?.eyebrow} />
              <Text
                as="h2"
                className="whitespace-pre-line"
                value={when?.heading}
              />
              <Text value={when?.body} />
            </section>
          ) : null}
          {hasCopy(where) ? (
            <section className="pickup-location">
              <MapPin size={32} strokeWidth={1.1} aria-hidden="true" />
              <Text className="eyebrow mt-6" value={where?.eyebrow} />
              <Text as="h2" value={where?.heading} />
              <Text value={where?.address} />
              <Text
                className="mt-5 text-sm leading-relaxed"
                value={where?.body}
              />
              {hasText(where?.cta) ? (
                <Link className="inline-link mt-7" href="/#products">
                  {where.cta}
                  <ArrowUpRight size={16} />
                </Link>
              ) : null}
            </section>
          ) : null}
        </div>
      ) : null}
      {hasCopy(p) ? (
        <section className="policy-section">
          <Text className="eyebrow" value={p?.eyebrow} />
          <Text as="h2" value={p?.heading} />
          <Text className="draft-note mt-3" value={p?.note} />
          {policies.length ? (
            <div className="policy-list">
              {policies.map(([title, body], i) => (
                <section key={i}>
                  <Text as="h3" value={title} />
                  <Text value={body} />
                </section>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
