import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("wordmark", className)}>
      salted<span aria-hidden="true">.</span>
    </span>
  );
}
