import type { SiteSettings } from "../../../sanity.types";
import { hasText } from "@/sanity/lib/content";
import { Spark } from "@/components/brand/spark";
export function AnnouncementBar({
  settings,
}: {
  settings: SiteSettings | null;
}) {
  const text = settings?.announcement?.text;
  if (!settings?.announcementEnabled || !hasText(text)) return null;
  return (
    <div className="announcement">
      <Spark className="mr-3" />
      {text}
      <Spark className="ml-3 hidden sm:inline-block" />
    </div>
  );
}
