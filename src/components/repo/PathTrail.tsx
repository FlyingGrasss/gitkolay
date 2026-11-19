"use client";

import { ChevronRight, House } from "lucide-react";
import { cx } from "@/lib/cx";

export function PathTrail({
  path,
  onNavigate,
}: {
  path: string;
  onNavigate: (path: string) => void;
}) {
  const segments = path.split("/").filter(Boolean);

  return (
    <nav
      aria-label="Dosya yolu"
      className="flex flex-wrap items-center gap-0.5 text-sm"
    >
      <button
        type="button"
        onClick={() => onNavigate("")}
        aria-current={segments.length === 0 ? "page" : undefined}
        className="inline-flex items-center gap-1.5 rounded-field px-2 py-1 font-medium text-muted transition-colors hover:bg-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <House aria-hidden="true" className="h-3.5 w-3.5" />
        Kök
      </button>

      {segments.map((segment, index) => {
        const segmentPath = segments.slice(0, index + 1).join("/");
        const isLast = index === segments.length - 1;

        return (
          <span key={segmentPath} className="flex items-center gap-0.5">
            <ChevronRight
              aria-hidden="true"
              className="h-3.5 w-3.5 shrink-0 text-strong"
            />
            {isLast ? (
              <span
                aria-current="page"
                className={cx("max-w-[18rem] truncate px-2 py-1 font-medium text-ink")}
              >
                {segment}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate(segmentPath)}
                className="max-w-[14rem] truncate rounded-field px-2 py-1 font-medium text-muted transition-colors hover:bg-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                {segment}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
