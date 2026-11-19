import Link from "next/link";
import { CalendarClock, GitBranch } from "lucide-react";
import { VisibilityBadge } from "@/components/ui/Badge";
import { formatAbsoluteDate, formatUpdatedAt } from "@/lib/format";
import type { GitHubRepo } from "@/lib/types";

export function repoHref(owner: string, repo: string): string {
  const params = new URLSearchParams({
    owner,
    repo,
  });

  return `/repo?${params.toString()}`;
}

export function RepoCard({ repo }: { repo: GitHubRepo }) {
  return (
    <Link
      href={repoHref(repo.owner.login, repo.name)}
      className="group flex h-full flex-col rounded-container border border-line bg-surface p-5 transition-colors hover:border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 break-words text-lg font-semibold leading-7 text-ink group-hover:underline">
          {repo.name}
        </h3>
        <VisibilityBadge isPrivate={repo.private} />
      </div>

      <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-muted">
        {repo.description || "Açıklama eklenmemiş."}
      </p>

      <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm text-muted">
        <div className="flex items-center gap-2">
          <CalendarClock aria-hidden="true" className="h-4 w-4 shrink-0" />
          <dt className="sr-only">Güncellendi</dt>
          <dd>
            <time
              dateTime={repo.updated_at}
              title={formatAbsoluteDate(repo.updated_at)}
            >
              {formatUpdatedAt(repo.updated_at)}
            </time>
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <GitBranch aria-hidden="true" className="h-4 w-4 shrink-0" />
          <dt>Varsayılan dal:</dt>
          <dd className="truncate font-mono text-xs text-ink">
            {repo.default_branch}
          </dd>
        </div>
      </dl>
    </Link>
  );
}
