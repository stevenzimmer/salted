import { PageIntro } from "@/components/content/page-intro";
import { UnsubscribeForm } from "@/components/marketing/unsubscribe-form";
import { getGlobalContent } from "@/sanity/lib/data";
import { clean } from "@/sanity/lib/content";
export async function generateMetadata() {
  const { commerce } = await getGlobalContent();
  return {
    title: clean(commerce?.unsubscribe?.title) || undefined,
    alternates: { canonical: "/unsubscribe" },
  };
}
export default async function UnsubscribePage() {
  const { commerce } = await getGlobalContent();
  const copy = commerce?.unsubscribe;
  return (
    <div className="shell pb-24">
      <PageIntro
        eyebrow={copy?.eyebrow}
        title={copy?.title}
        description={copy?.description}
      />
      <UnsubscribeForm copy={copy} />
    </div>
  );
}
