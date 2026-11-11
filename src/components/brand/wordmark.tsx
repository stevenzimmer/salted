import { cn } from "@/lib/utils";
import { Spark } from "@/components/brand/spark";
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("wordmark", className)}>
      salted
      <Spark className="wordmark-spark" />
    </span>
  );
}
