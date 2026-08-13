import { cn } from "@/lib/utils";
import { STATUS_LABELS, STATUS_STYLES, type ApplicationStatus } from "@/lib/constants";

export function StatusBadge({
  status,
  className,
}: {
  status: ApplicationStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 text-[10px] uppercase tracking-wider whitespace-nowrap",
        STATUS_STYLES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
