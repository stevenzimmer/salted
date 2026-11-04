"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
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
import type { SiteSettings } from "../../../sanity.types";
import {
  navigation,
  isActiveNavigationLink,
  isSamePageAnchor,
} from "@/lib/navigation";
import { hasText } from "@/sanity/lib/content";
import { Text } from "@/components/cms/text";
import { cn } from "@/lib/utils";

export function SiteHeader({ settings }: { settings: SiteSettings | null }) {
  const links = navigation(settings, "headerNavigation");
  const pathname = usePathname();
  const { items, setOpen } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const count = items.reduce((total, item) => total + item.quantity, 0);

  function openCart() {
    setOpen(true);
  }
  function closeMenu() {
    setMenuOpen(false);
  }
  function restoreMenuFocus(event: Event) {
    event.preventDefault();
    menuTriggerRef.current?.focus({ preventScroll: true });
  }

  return (
    <header className="site-header">
      <div className="shell flex min-h-24 items-center justify-between gap-6 py-3">
        {hasText(settings?.brand?.wordmark) ? (
          <Link href="/" aria-label="Home" className="shrink-0">
            <Wordmark
              value={settings?.brand?.wordmark}
              className="text-[44px]"
            />
          </Link>
        ) : null}
        <div className="min-w-0 lg:flex items-center gap-8">
          {links.length ? (
            <nav
              className="hidden min-w-0 flex-wrap items-center justify-end gap-x-7 gap-y-1 lg:flex"
              aria-label="Main navigation"
            >
              {links.map((link) => {
                const active = isActiveNavigationLink(link.href, pathname);
                // Let the browser scroll same-page anchors, including repeated clicks.
                const NavigationLink =
                  isSamePageAnchor(link.href, pathname) ||
                  !link.href.startsWith("/")
                    ? "a"
                    : Link;
                return (
                  <NavigationLink
                    key={link.key}
                    href={link.href}
                    className={cn("nav-link", active && "nav-order")}
                    aria-current={active ? "page" : undefined}
                  >
                    {link.label}
                  </NavigationLink>
                );
              })}
            </nav>
          ) : null}
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="cart-trigger"
              onClick={openCart}
              aria-label={`Open cart, ${count} ${count === 1 ? "item" : "items"}`}
            >
              <ShoppingBag size={23} strokeWidth={1.5} />
              <Text
                as="span"
                className="hidden sm:inline text-xl"
                value={settings?.utilityLabels?.cart}
              />
              <span className="cart-count" aria-live="polite">
                {count}
              </span>
            </button>
            {links.length ? (
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger
                  ref={menuTriggerRef}
                  className="icon-button lg:hidden"
                  aria-label="Open navigation"
                >
                  <Menu size={23} strokeWidth={1.5} />
                </SheetTrigger>
                <SheetContent
                  className="mobile-menu"
                  onCloseAutoFocus={restoreMenuFocus}
                >
                  <SheetHeader>
                    <SheetTitle
                      className={
                        hasText(settings?.brand?.wordmark)
                          ? undefined
                          : "sr-only"
                      }
                    >
                      {hasText(settings?.brand?.wordmark) ? (
                        <Wordmark
                          value={settings.brand.wordmark}
                          className="text-5xl"
                        />
                      ) : (
                        "Navigation"
                      )}
                    </SheetTitle>
                    <SheetDescription
                      className={
                        hasText(settings?.brand?.mobileDescription)
                          ? undefined
                          : "sr-only"
                      }
                    >
                      {hasText(settings?.brand?.mobileDescription)
                        ? settings.brand.mobileDescription
                        : "Navigation"}
                    </SheetDescription>
                  </SheetHeader>
                  <nav
                    aria-label="Mobile navigation"
                    className="mt-10 flex flex-col"
                  >
                    {links.map((link) => {
                      const active = isActiveNavigationLink(
                        link.href,
                        pathname,
                      );
                      const NavigationLink =
                        isSamePageAnchor(link.href, pathname) ||
                        !link.href.startsWith("/")
                          ? "a"
                          : Link;
                      return (
                        <NavigationLink
                          key={link.key}
                          href={link.href}
                          onClick={closeMenu}
                          className={cn(
                            "mobile-nav-link",
                            active && "nav-order",
                          )}
                          aria-current={active ? "page" : undefined}
                        >
                          {link.label}
                          <ArrowUpRight size={20} />
                        </NavigationLink>
                      );
                    })}
                  </nav>
                  <Text
                    className="eyebrow mt-auto"
                    value={settings?.brand?.mobileNote}
                  />
                </SheetContent>
              </Sheet>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
