import type { SiteSettings } from "../../../sanity.types";
import { hasText } from "@/sanity/lib/content";
export function AnnouncementBar({
  settings,
}: {
  settings: SiteSettings | null;
}) {
  const text = settings?.announcement?.text;
  if (!settings?.announcementEnabled || !hasText(text)) return null;
  return (
    <div className="announcement">
      <span className="mr-3" aria-hidden="true">
        {"\u2733\uFE0E"}
      </span>
      {text}
      <span className="ml-3 hidden sm:inline" aria-hidden="true">
        {"\u2733\uFE0E"}
      </span>
    </div>
  );
}
