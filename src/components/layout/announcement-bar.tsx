import { siteConfig } from "@/data/site-config";

export function AnnouncementBar() {
  return (
    <div className="announcement">
      <span className="mr-3" aria-hidden="true">
        ✳
      </span>
      {siteConfig.announcement}
      <span className="ml-3 hidden sm:inline" aria-hidden="true">
        ✳
      </span>
    </div>
  );
}
