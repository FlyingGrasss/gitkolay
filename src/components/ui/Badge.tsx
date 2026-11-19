import { Globe, Lock } from "lucide-react";
import { cx } from "@/lib/cx";

export function VisibilityBadge({ isPrivate }: { isPrivate: boolean }) {
  const Icon = isPrivate ? Lock : Globe;

  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
        isPrivate
          ? "border-line bg-subtle text-muted"
          : "border-success-line bg-success-soft text-success",
      )}
    >
      <Icon aria-hidden="true" className="h-3 w-3" />
      {isPrivate ? "Gizli" : "Herkese açık"}
    </span>
  );
}
