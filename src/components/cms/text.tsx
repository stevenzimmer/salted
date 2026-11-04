import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { hasText } from "@/sanity/lib/content";

type TextProps<T extends ElementType> = {
  as?: T;
  value?: string | null;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children">;

// Keep the original encoded string in the DOM; clean only for the presence test.
export function Text<T extends ElementType = "p">({
  as,
  value,
  children,
  ...props
}: TextProps<T>) {
  if (!hasText(value)) return null;
  const Component = as || "p";
  return (
    <Component {...props}>
      {value}
      {children}
    </Component>
  );
}
