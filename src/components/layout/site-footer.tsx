import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { LogoMark } from "@/components/brand/logo-mark";
import { siteConfig } from "@/data/site-config";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <Link href="/" aria-label="Salted Focaccia home">
            <Wordmark className="text-[88px] sm:text-[110px]" />
          </Link>
          <p className="eyebrow mt-5">Sourdough focaccia + more</p>
          <p className="mt-4 text-sm opacity-75">
            Good bread. Rocklin, California.
          </p>
        </div>
        <nav className="footer-nav" aria-label="Footer navigation">
          {siteConfig.navigation.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
          <Link href="/storage-heating">Storage + reheating</Link>
        </nav>
        <div className="flex flex-col items-start gap-6 lg:items-end">
          <LogoMark />
          <a
            className="inline-link text-sm"
            href={siteConfig.instagram.url}
            target="_blank"
            rel="noreferrer"
          >
            {siteConfig.instagram.label}
            <ArrowUpRight size={16} />
          </a>
        </div>
      </div>
      <div className="shell footer-bottom">
        <p>
          © {new Date().getFullYear()} Salted Focaccia · {siteConfig.domain}
        </p>
        <p className="preview-label">Storefront preview · no live orders</p>
        <div className="flex gap-6">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
