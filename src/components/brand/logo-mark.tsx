import type { SiteSettings } from "../../../sanity.types";
import { hasText, clean } from "@/sanity/lib/content";
import { Text } from "@/components/cms/text";
export function LogoMark({ settings }: { settings: SiteSettings | null }) {
  const brand = settings?.brand;
  if (!hasText(brand?.sealTop) && !hasText(brand?.sealBottom)) return null;
  return (
    <div
      className="brand-seal"
      role="img"
      aria-label={[brand?.businessName, brand?.sealTop, brand?.sealBottom]
        .map(clean)
        .filter(Boolean)
        .join(" — ")}
    >
      <Text as="span" value={brand?.sealTop} />
      <span className="seal-flower" aria-hidden="true">
        {"\u2733\uFE0E"}
      </span>
      <Text as="span" value={brand?.sealBottom} />
    </div>
  );
}
