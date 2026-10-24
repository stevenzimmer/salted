import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageIntro } from "@/components/content/page-intro";
import { LogoMark } from "@/components/brand/logo-mark";
import { siteConfig } from "@/data/site-config";

export const metadata: Metadata = {
  title: "A little about Salted",
  description:
    "Sourdough focaccia and something good for the table. Meet Salted Focaccia.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="shell pb-24">
      <PageIntro
        eyebrow="A little about salted"
        title={siteConfig.about.heading}
        description={siteConfig.about.description}
      />
      <div className="about-page-grid">
        <div className="about-page-image">
          <Image
            src="https://placehold.co/1000x1200/D8C6AF/594735/png?text=meet+you%0Aat+the%0Atable.&font=lora"
            alt="Placeholder for future Salted bakery and founder photography"
            fill
            unoptimized
            sizes="(max-width: 767px) 100vw, 50vw"
          />
        </div>
        <div className="about-page-copy">
          <LogoMark />
          <h2>
            Bread for
            <br />
            the good moments.
          </h2>
          <p>
            From sourdough focaccia to round loaves, Salted is about making a
            little room for good bread.
          </p>
          <p className="draft-note">
            {siteConfig.about.status} Founder details, bakery history, and
            sourcing information will be added when final client-approved copy
            is supplied.
          </p>
          <Link href="/#products" className="inline-link">
            Find your good stuff <ArrowUpRight size={17} />
          </Link>
        </div>
      </div>
    </div>
  );
}
