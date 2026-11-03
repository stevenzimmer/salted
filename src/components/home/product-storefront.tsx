"use client";

import type { CommerceCopy } from "../../../sanity.types";
import { hasText } from "@/sanity/lib/content";
import { Text } from "@/components/cms/text";
import { useState } from "react";
import type { ReactNode } from "react";

type Category = "all" | "focaccia" | "sourdough";
export function ProductStorefront({
  items,
  copy,
}: {
  copy?: CommerceCopy["product"];
  items: {
    id: string;
    category: "focaccia" | "sourdough";
    content: ReactNode;
  }[];
}) {
  const [category, setCategory] = useState<Category>("focaccia");
  const filters = [
    { value: "focaccia" as const, label: copy?.focacciaFilter },
    { value: "sourdough" as const, label: copy?.sourdoughFilter },
    { value: "all" as const, label: copy?.allFilter },
  ].filter((filter) => hasText(filter.label));
  const currentCategory = filters.some((filter) => filter.value === category)
    ? category
    : (filters[0]?.value ?? "all");
  if (!items.length) return null;
  return (
    <>
      {filters.length || hasText(copy?.menuNote) ? (
        <div className="storefront-toolbar">
          {filters.length ? (
            <div
              className="product-filters"
              role="group"
              aria-label="Filter the menu"
            >
              {filters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  aria-pressed={currentCategory === filter.value}
                  onClick={() => setCategory(filter.value)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          ) : null}
          <Text value={copy?.menuNote} />
        </div>
      ) : null}
      <div className="product-grid" aria-live="polite">
        {items
          .filter(
            (item) =>
              currentCategory === "all" || item.category === currentCategory,
          )
          .map((item) => (
            <div key={item.id}>{item.content}</div>
          ))}
      </div>
    </>
  );
}
