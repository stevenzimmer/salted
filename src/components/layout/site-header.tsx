"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, ShoppingBag, ArrowUpRight } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { useCart } from "@/components/commerce/cart-provider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { siteConfig } from "@/data/site-config";

export function SiteHeader() {
  const { items, setOpen } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const count = items.reduce((total, item) => total + item.quantity, 0);

  function openCart() {
    setOpen(true);
  }
  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="site-header">
      <div className="shell flex h-24 items-center justify-between gap-6">
        <Link href="/" aria-label="Salted Focaccia home" className="shrink-0">
          <Wordmark className="text-[44px]" />
        </Link>
        <nav
          className="hidden items-center gap-7 lg:flex"
          aria-label="Main navigation"
        >
          {siteConfig.navigation.map((link, index) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${index === 0 ? "nav-order" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="cart-trigger"
            onClick={openCart}
            aria-label={`Open cart, ${count} ${count === 1 ? "item" : "items"}`}
          >
            <ShoppingBag size={19} strokeWidth={1.5} />
            <span className="hidden sm:inline">Your bag</span>
            <span className="cart-count" aria-live="polite">
              {count}
            </span>
          </button>
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              className="icon-button lg:hidden"
              aria-label="Open navigation"
            >
              <Menu size={23} strokeWidth={1.5} />
            </SheetTrigger>
            <SheetContent className="mobile-menu">
              <SheetHeader>
                <SheetTitle>
                  <Wordmark className="text-5xl" />
                </SheetTitle>
                <SheetDescription>
                  A little salty. A lot to love.
                </SheetDescription>
              </SheetHeader>
              <nav
                aria-label="Mobile navigation"
                className="mt-10 flex flex-col"
              >
                {siteConfig.navigation.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMenu}
                    className="mobile-nav-link"
                  >
                    {link.label}
                    <ArrowUpRight size={20} />
                  </Link>
                ))}
              </nav>
              <p className="eyebrow mt-auto">Made for your Friday.</p>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
