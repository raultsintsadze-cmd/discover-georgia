import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Spinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <span role="status" className="inline-flex items-center">
      <Loader2 className={cn("h-5 w-5 animate-spin text-ink-500", className)} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
