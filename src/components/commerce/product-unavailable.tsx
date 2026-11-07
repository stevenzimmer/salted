import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CommerceCopy } from "../../../sanity.types";
import { Text } from "@/components/cms/text";
import { hasCopy, hasText } from "@/sanity/lib/content";

export function ProductUnavailable({
  copy,
}: {
  copy?: CommerceCopy["inactiveProduct"];
}) {
  if (!hasCopy(copy)) return null;

  return (
    <div className="mt-7 border-l-2 border-primary bg-muted/40 p-5 sm:p-6">
      <Text
        as="h2"
        className="font-serif text-2xl text-primary"
        value={copy?.heading}
      />
      <Text
        className="mt-3 whitespace-pre-line text-sm leading-relaxed"
        value={copy?.body}
      />
      {hasText(copy?.cta) ? (
        <Link href="/special-orders" className="inline-link mt-4">
          {copy.cta}
          <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}
