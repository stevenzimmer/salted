"use client";

import { useState } from "react";
import type { ReactNode } from "react";

type Category = "all" | "focaccia" | "sourdough";
const filters: { value: Category; label: string }[] = [
  { value: "focaccia", label: "Focaccia" },
  { value: "sourdough", label: "Sourdough" },
    { value: "all", label: "All the good stuff" },
];

export function ProductStorefront({
  items,
}: {
  items: {
    id: string;
    category: "focaccia" | "sourdough";
    content: ReactNode;
  }[];
}) {
  const [category, setCategory] = useState<Category>("focaccia");
  return (
    <>
      <div className="storefront-toolbar">
        <div
          className="product-filters"
          role="group"
          aria-label="Filter the menu"
        >
          {filters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={category === filter.value}
              onClick={() => setCategory(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <p>Small batches. Big bread energy.</p>
      </div>
      <div className="product-grid" aria-live="polite">
        {items
          .filter((item) => category === "all" || item.category === category)
          .map((item) => (
            <div key={item.id}>{item.content}</div>
          ))}
      </div>
    </>
  );
}
