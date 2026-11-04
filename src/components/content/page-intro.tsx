import { Text } from "@/components/cms/text";
import { hasCopy } from "@/sanity/lib/content";

export function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string | null;
  title?: string | null;
  description?: string | null;
}) {
  if (!hasCopy({ eyebrow, title, description })) return null;
  return (
    <header className="page-intro">
      <Text className="eyebrow" value={eyebrow} />
      <Text as="h1" value={title} />
      <Text className="page-description" value={description} />
    </header>
  );
}
