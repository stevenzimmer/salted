import Link from "next/link";
import { PageIntro } from "@/components/content/page-intro";
import { getGlobalContent } from "@/sanity/lib/data";
import { hasText } from "@/sanity/lib/content";
export default async function NotFound() {
  const { settings } = await getGlobalContent();
  const copy = settings?.notFound;
  return (
    <div className="shell min-h-[60vh] pb-24">
      <PageIntro {...copy} />
      {hasText(copy?.cta) ? (
        <Link href="/#products" className="button-primary">
          {copy.cta}
        </Link>
      ) : null}
    </div>
  );
}
