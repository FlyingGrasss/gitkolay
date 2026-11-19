"use client";

import { ChevronRight, FileText, Folder, Package } from "lucide-react";
import { cx } from "@/lib/cx";
import { formatBytes } from "@/lib/files";
import type { DirectoryEntry } from "@/lib/files";

const ICONS = {
  directory: Folder,
  file: FileText,
  submodule: Package,
};

const TYPE_LABELS = {
  directory: "Klasör",
  file: "Dosya",
  submodule: "Alt modül",
};

export function FileTable({
  entries,
  onOpen,
}: {
  entries: DirectoryEntry[];
  onOpen: (path: string) => void;
}) {
  return (
    <div className="file-scroll overflow-x-auto rounded-container border border-line">
      <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
        <caption className="sr-only">Klasörler ve dosyalar</caption>
        <thead>
          <tr className="border-b border-line bg-subtle text-xs uppercase tracking-wide text-muted">
            <th scope="col" className="px-4 py-3 font-medium">
              Ad
            </th>
            <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">
              Tür
            </th>
            <th
              scope="col"
              className="hidden px-4 py-3 text-right font-medium sm:table-cell"
            >
              Boyut
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {entries.map((entry) => {
            const Icon = ICONS[entry.type];
            const isDirectory = entry.type === "directory";

            return (
              <tr key={entry.path} className="bg-surface">
                <td className="p-0">
                  <button
                    type="button"
                    onClick={() => onOpen(entry.path)}
                    className={cx(
                      "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus",
                      isDirectory ? "font-medium text-ink" : "text-ink",
                    )}
                  >
                    <Icon
                      aria-hidden="true"
                      className={cx(
                        "h-4 w-4 shrink-0",
                        isDirectory ? "text-muted" : "text-strong",
                      )}
                    />
                    <span className="min-w-0 break-all">{entry.name}</span>
                    <ChevronRight
                      aria-hidden="true"
                      className="ml-auto h-4 w-4 shrink-0 text-strong"
                    />
                  </button>
                </td>
                <td className="hidden px-4 py-3 text-muted sm:table-cell">
                  {TYPE_LABELS[entry.type]}
                </td>
                <td className="hidden px-4 py-3 text-right text-muted sm:table-cell">
                  {entry.type === "file" ? formatBytes(entry.size) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
