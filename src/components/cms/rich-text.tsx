import { PortableText } from "@portabletext/react";
import type { CmsPortableText } from "@/sanity/lib/content";
import {
  hasPortableTextContent,
  safeUrl,
  visibleBlocks,
} from "@/sanity/lib/content";

export function RichText({
  value,
  className,
}: {
  value?: CmsPortableText | null;
  className?: string;
}) {
  if (!hasPortableTextContent(value)) return null;
  return (
    <div className={className}>
      <PortableText
        value={visibleBlocks(value)}
        components={{
          marks: {
            link: ({ value: link, children }) => {
              const href = safeUrl(link?.href);
              return href ? (
                <a href={href} className="underline underline-offset-4">
                  {children}
                </a>
              ) : (
                <>{children}</>
              );
            },
          },
        }}
      />
    </div>
  );
}
