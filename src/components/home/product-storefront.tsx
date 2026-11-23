"use client";

import type { CommerceCopy } from "../../../sanity.types";
import { clean, hasText } from "@/sanity/lib/content";
import { Text } from "@/components/cms/text";
import { useState } from "react";
import type { ReactNode } from "react";
import { trackProductFilterSelect } from "@/lib/analytics";

export function ProductStorefront({
  items,
  copy,
}: {
  copy?: CommerceCopy["product"];
  items: {
    id: string;
    category: string;
    content: ReactNode;
  }[];
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const filters = (copy?.filters ?? []).flatMap((filter) => {
    const category = clean(filter.category?._ref);
    return hasText(filter.label) &&
      (filter.showAll === true || hasText(category))
      ? [
          {
            key: filter._key,
            label: filter.label,
            category,
            showAll: filter.showAll === true,
          },
        ]
      : [];
  });
  const currentFilter =
    filters.find((filter) => filter.key === selectedKey) ?? filters[0];
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
                  key={filter.key}
                  type="button"
                  aria-pressed={currentFilter?.key === filter.key}
                  onClick={() => {
                    if (currentFilter?.key === filter.key) return;
                    setSelectedKey(filter.key);
                    trackProductFilterSelect({
                      filter_id: filter.key,
                      filter_label: filter.label,
                      category_id: filter.showAll ? "all" : filter.category,
                      show_all: filter.showAll,
                      result_count: items.filter(
                        (item) =>
                          filter.showAll || item.category === filter.category,
                      ).length,
                    });
                  }}
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
              !currentFilter ||
              currentFilter.showAll ||
              item.category === currentFilter.category,
          )
          .map((item) => (
            <div key={item.id}>{item.content}</div>
          ))}
      </div>
    </>
  );
}
