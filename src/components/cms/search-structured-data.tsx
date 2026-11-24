import "server-only";
import {
  getFixedSearchPage,
  getSearchPickup,
  getSearchSettings,
  isSearchDraft,
  type FixedSearchPath,
} from "@/lib/seo/content";
import {
  businessEntities,
  pageEntities,
  serializeStructuredData,
} from "@/lib/seo/structured-data";

export function SearchStructuredData({ nodes }: { nodes: readonly object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeStructuredData(nodes) }}
    />
  );
}

export async function FixedPageStructuredData({
  path,
}: {
  path: FixedSearchPath;
}) {
  const [draft, settings, content] = await Promise.all([
    isSearchDraft(),
    getSearchSettings(),
    getFixedSearchPage(path),
  ]);
  if (draft || !content.eligible || settings?.seo?.noIndex === true)
    return null;
  const page = pageEntities(path, content.config.title, content.config.type);
  return (
    <SearchStructuredData
      nodes={
        path === "/"
          ? [...businessEntities(settings, await getSearchPickup()), ...page]
          : page
      }
    />
  );
}
