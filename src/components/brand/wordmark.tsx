import { cn } from "@/lib/utils";
import { hasText } from "@/sanity/lib/content";
export function Wordmark({
  className,
  value,
}: {
  className?: string;
  value?: string | null;
}) {
  if (!hasText(value)) return null;
  return (
    <span className={cn("wordmark", className)}>
      {value}
      <span aria-hidden="true">.</span>
    </span>
  );
}
