import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cx } from "@/lib/cx";

type AlertTone = "info" | "success" | "warning" | "danger";

const TONES: Record<AlertTone, { box: string; icon: string; title: string }> = {
  info: {
    box: "border-line bg-subtle text-ink",
    icon: "text-muted",
    title: "text-ink",
  },
  success: {
    box: "border-success-line bg-success-soft text-ink",
    icon: "text-success",
    title: "text-success",
  },
  warning: {
    box: "border-warning-line bg-warning-soft text-ink",
    icon: "text-warning",
    title: "text-warning",
  },
  danger: {
    box: "border-danger-line bg-danger-soft text-ink",
    icon: "text-danger",
    title: "text-danger",
  },
};

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: AlertCircle,
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: AlertTone;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const Icon = ICONS[tone];
  const styles = TONES[tone];

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cx("rounded-container border p-4", styles.box, className)}
    >
      <div className="flex items-start gap-3">
        <Icon
          aria-hidden="true"
          className={cx("mt-0.5 h-5 w-5 shrink-0", styles.icon)}
        />
        <div className="min-w-0 space-y-1">
          {title ? (
            <p className={cx("text-sm font-semibold", styles.title)}>{title}</p>
          ) : null}
          <div className="text-sm leading-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
