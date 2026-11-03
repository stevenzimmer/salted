import {
  NextStudio,
  metadata as studioMetadata,
  viewport,
} from "next-sanity/studio";
import config from "../../../../../sanity.config";
import { isSanityConfigured } from "@/sanity/env";

export const dynamic = "force-static";
export const metadata = {
  ...studioMetadata,
  title: "Salted Focaccia Studio",
  robots: { index: false, follow: false },
};
export { viewport };
export default function StudioPage() {
  if (!isSanityConfigured)
    return (
      <main style={{ padding: 32, fontFamily: "system-ui" }}>
        <h1>Connect Sanity Studio</h1>
        <p>
          Set NEXT_PUBLIC_SANITY_PROJECT_ID in .env.local, then restart the
          development server. See the README for setup.
        </p>
      </main>
    );
  return <NextStudio config={config} />;
}
