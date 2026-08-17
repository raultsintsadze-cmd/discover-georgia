import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12 text-center", className)}>
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-ink-500">
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-h3 text-ink-900">{title}</p>
        {description && <p className="text-body-sm text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
