import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageIntro } from "@/components/content/page-intro";
import { LogoMark } from "@/components/brand/logo-mark";
import { CmsImage } from "@/components/cms/image";
import { Text } from "@/components/cms/text";
import { hasCopy, hasImage, hasText } from "@/sanity/lib/content";
import { fetchContent } from "@/sanity/lib/fetch-content";
import { ABOUT_QUERY } from "@/sanity/lib/queries";
import { contentMetadata } from "@/sanity/lib/metadata";
export async function generateMetadata() {
  return contentMetadata((await fetchContent(ABOUT_QUERY))?.seo, "/about");
}
export default async function AboutPage() {
  const page = await fetchContent(ABOUT_QUERY);
  if (!page) return null;
  if (!hasCopy(page.intro) && !hasCopy(page.story) && !hasImage(page.image))
    return null;
  const story = page.story,
    copy = hasCopy(story);
  return (
    <div className="shell pb-24">
      <PageIntro {...page.intro} />
      {copy || hasImage(page.image) ? (
        <div
          className={`about-page-grid ${!copy || !hasImage(page.image) ? "cms-single-column" : ""}`}
        >
          {hasImage(page.image) ? (
            <div className="about-page-image">
              <CmsImage
                image={page.image}
                aspectRatio={5 / 6}
                documentType={page._type}
                documentId={page._id}
                path="image"
                sizes="(max-width: 767px) 100vw, 50vw"
              />
            </div>
          ) : null}
          {copy ? (
            <div className="about-page-copy">
              <LogoMark />
              <Text
                as="h2"
                className="whitespace-pre-line"
                value={story?.heading}
              />
              <Text value={story?.body} />
              <Text className="draft-note" value={story?.note} />
              {hasText(story?.cta) ? (
                <Link href="/#products" className="inline-link">
                  {story.cta}
                  <ArrowUpRight size={17} />
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
