"use client";

import { useId } from "react";
import { helpClasses, labelClasses } from "@/components/ui/form";
import type { GitHubBranch } from "@/lib/types";

export function BranchSwitcher({
  branches,
  branch,
  disabled,
  onChange,
}: {
  branches: GitHubBranch[];
  branch: string;
  disabled?: boolean;
  onChange: (branch: string) => void;
}) {
  const selectId = useId();
  const helpId = useId();
  const names = branches.map((item) => item.name);

  if (branch && !names.includes(branch)) {
    names.unshift(branch);
  }

  return (
    <div className="min-w-[13rem]">
      <label htmlFor={selectId} className={labelClasses}>
        Sürüm
      </label>
      <select
        id={selectId}
        value={branch}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || names.length === 0}
        aria-describedby={helpId}
        className="block h-10 w-full rounded-field border border-line bg-surface px-3 text-sm font-medium text-ink focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/25 disabled:cursor-not-allowed disabled:bg-subtle disabled:text-muted"
      >
        {names.length === 0 ? <option value="">Sürüm yok</option> : null}
        {names.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <p id={helpId} className={helpClasses}>
        GitHub&apos;da buna dal (branch) denir.
      </p>
    </div>
  );
}
