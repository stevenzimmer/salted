import Link from "next/link";
import { PageIntro } from "@/components/content/page-intro";
export default function NotFound() {
  return (
    <div className="shell min-h-[60vh] pb-24">
      <PageIntro
        eyebrow="404 · Crumbs, nothing here"
        title={"This one’s\nout of the oven."}
        description="We couldn’t find that page. There’s still plenty of good stuff on the menu."
      />
      <Link href="/#products" className="button-primary">
        Back to the good stuff
      </Link>
    </div>
  );
}
