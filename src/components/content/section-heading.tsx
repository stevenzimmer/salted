import type { ReactNode } from "react";
import { Text } from "@/components/cms/text";
import { hasText } from "@/sanity/lib/content";
export function SectionHeading({
  eyebrow,
  heading,
  action,
}: {
  eyebrow?: string | null;
  heading?: string | null;
  action?: ReactNode;
}) {
  const text = hasText(eyebrow) || hasText(heading);
  if (!text && !action) return null;
  return (
    <div className="section-heading">
      {text ? (
        <div>
          <Text className="eyebrow" value={eyebrow} />
          <Text as="h2" value={heading} />
        </div>
      ) : null}
      {action}
    </div>
  );
}
