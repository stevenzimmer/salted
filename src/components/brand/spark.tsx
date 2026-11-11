import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

export function Spark({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="1em"
      height="1.2em"
      {...props}
      className={cn(
        "brand-spark inline-block shrink-0 align-[-0.15em]",
        className,
      )}
      viewBox="0 0 40 48"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20 0C23.5 14 27 18.5 40 24C27 29.5 23.5 34 20 48C16.5 34 13 29.5 0 24C13 18.5 16.5 14 20 0Z" />
    </svg>
  );
}
