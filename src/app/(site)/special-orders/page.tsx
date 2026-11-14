import { PageIntro } from "@/components/content/page-intro";
import { SpecialOrderForm } from "@/components/special-orders/special-order-form";
import { Text } from "@/components/cms/text";
import { specialOrderConfig } from "@/data/special-order-config";
import { money } from "@/lib/format";
import { hasCopy, hasText } from "@/sanity/lib/content";
import { fetchContent } from "@/sanity/lib/fetch-content";
import {
  MARKETING_CONSENT_QUERY,
  SPECIAL_ORDERS_QUERY,
} from "@/sanity/lib/queries";
import { contentMetadata } from "@/sanity/lib/metadata";
export async function generateMetadata() {
  return contentMetadata(
    (await fetchContent(SPECIAL_ORDERS_QUERY))?.seo,
    "/special-orders",
  );
}
export default async function SpecialOrdersPage() {
  const [page, marketingConsentLabel] = await Promise.all([
    fetchContent(SPECIAL_ORDERS_QUERY),
    fetchContent(MARKETING_CONSENT_QUERY),
  ]);
  if (!page) return null;
  const p = page.planning;
  const workflow = [
    p?.requestStep,
    p?.reviewStep,
    p?.approvalStep,
    p?.paymentStep,
  ]
    .map((text, index) => ({ text, index }))
    .filter((step) => hasText(step.text));
  const stats = [
    {
      label: p?.minimumLabel,
      value: money(specialOrderConfig.minimumProductSubtotal),
    },
    { label: p?.feeLabel, value: `+ ${money(specialOrderConfig.fee)}` },
    { label: p?.leadTimeLabel, value: p?.leadTimeValue },
  ].filter((stat) => hasText(stat.label) && hasText(stat.value));
  return (
    <div className="shell pb-24">
      <PageIntro {...page.intro} />
      <div
        className={`special-order-layout ${!hasCopy(p) ? "cms-single-column" : ""}`}
      >
        {hasCopy(p) ? (
          <aside className="special-order-aside">
            <Text as="h2" className="whitespace-pre-line" value={p?.heading} />
            <Text className="mt-5 leading-relaxed" value={p?.body} />
            {stats.length ? (
              <dl>
                {stats.map((stat, i) => (
                  <div key={i}>
                    <dt>{stat.label}</dt>
                    <dd>{stat.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <Text className="text-xs leading-relaxed" value={p?.note} />
            {workflow.length ? (
              <ol className="special-workflow">
                {workflow.map((step) => (
                  <li key={step.index}>
                    <span>{String(step.index + 1).padStart(2, "0")}</span>
                    {step.text}
                  </li>
                ))}
              </ol>
            ) : null}
          </aside>
        ) : null}
        <SpecialOrderForm
          copy={page.form}
          validation={page.validation}
          marketingConsentLabel={marketingConsentLabel}
        />
      </div>
    </div>
  );
}
