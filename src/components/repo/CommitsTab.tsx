"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, GitCommitHorizontal, History, UserRound } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, Spinner } from "@/components/ui/Skeleton";
import { ApiErrorNotice } from "@/components/repo/ApiErrorNotice";
import { CommitDetail } from "@/components/repo/CommitDetail";
import { GitHubApiError, getErrorMessage, listCommits } from "@/lib/github";
import { formatAbsoluteDate, formatUpdatedAt } from "@/lib/format";
import type { GitHubCommitSummary } from "@/lib/types";

const PAGE_SIZE = 30;

function commitDate(commit: GitHubCommitSummary): string {
  return commit.commit.author?.date ?? commit.commit.committer?.date ?? "";
}

function commitAuthor(commit: GitHubCommitSummary): string {
  return commit.author?.login ?? commit.commit.author?.name ?? "Bilinmeyen";
}

function CommitList({
  owner,
  repo,
  branch,
  pathFilter,
  token,
  onOpenCommit,
  onClearPath,
  onOpenToken,
}: {
  owner: string;
  repo: string;
  branch: string;
  pathFilter: string;
  token: string | null;
  onOpenCommit: (sha: string) => void;
  onClearPath: () => void;
  onOpenToken: () => void;
}) {
  const [commits, setCommits] = useState<GitHubCommitSummary[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState<unknown>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const requestId = useRef(0);

  const loadFirstPage = useCallback(async () => {
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setError(null);
    setLoadMoreError(null);
    setLoadingMore(false);
    setPage(1);
    setHasMore(false);

    if (!branch) {
      setCommits([]);
      setStatus("ready");
      return;
    }

    setStatus("loading");
    setCommits([]);

    try {
      const data = await listCommits(owner, repo, {
        branch,
        path: pathFilter || undefined,
        page: 1,
        token,
      });

      if (requestId.current !== currentRequest) {
        return;
      }

      setCommits(data);
      setHasMore(data.length === PAGE_SIZE);
      setStatus("ready");
    } catch (caught) {
      if (requestId.current !== currentRequest) {
        return;
      }

      setError(caught);
      setStatus("error");
    }
  }, [owner, repo, branch, pathFilter, token]);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) {
      return;
    }

    const currentRequest = requestId.current;
    const nextPage = page + 1;
    setLoadingMore(true);
    setLoadMoreError(null);

    try {
      const data = await listCommits(owner, repo, {
        branch,
        path: pathFilter || undefined,
        page: nextPage,
        token,
      });

      if (requestId.current !== currentRequest) {
        return;
      }

      setCommits((previous) => [...previous, ...data]);
      setPage(nextPage);
      setHasMore(data.length === PAGE_SIZE);
    } catch (caught) {
      if (requestId.current === currentRequest) {
        setLoadMoreError(getErrorMessage(caught));
      }
    } finally {
      if (requestId.current === currentRequest) {
        setLoadingMore(false);
      }
    }
  };

  return (
    <section className="space-y-5" aria-busy={status === "loading" || undefined}>
      <div>
        <h2 className="text-lg font-semibold text-ink">Commitler</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          {branch
            ? `${branch} dalındaki değişiklik kayıtları. Bir kaydı açarak nelerin değiştiğini görebilirsiniz.`
            : "Bu depodaki değişiklik kayıtları."}
        </p>
      </div>

      {pathFilter ? (
        <div className="flex flex-wrap items-center gap-2 rounded-container border border-line bg-subtle px-4 py-3 text-sm">
          <History
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-muted"
          />
          <span className="text-muted">Dosya geçmişi:</span>
          <span className="min-w-0 break-all font-mono text-xs font-medium text-ink">
            {pathFilter}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={onClearPath}
          >
            Filtreyi kaldır
          </Button>
        </div>
      ) : null}

      {status === "loading" ? (
        <div className="space-y-3">
          <div className="space-y-3 rounded-container border border-line p-4">
            {[0, 1, 2, 3, 4].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>
          <span className="sr-only">Commitler yükleniyor…</span>
        </div>
      ) : null}

      {status === "error" ? (
        <ApiErrorNotice
          title="Commitler yüklenemedi"
          error={error}
          token={token}
          onOpenToken={onOpenToken}
          onRetry={() => {
            void loadFirstPage();
          }}
        >
          {error instanceof GitHubApiError && error.status === 404 ? (
            <p>
              Seçili dal silinmiş veya adı değişmiş olabilir. Üstten başka bir
              sürüm seçmeyi deneyin.
            </p>
          ) : null}
        </ApiErrorNotice>
      ) : null}

      {status === "ready" && commits.length === 0 ? (
        <EmptyState
          icon={<GitCommitHorizontal aria-hidden="true" className="h-8 w-8" />}
          title="Henüz commit yok."
          description={
            pathFilter
              ? "Bu dosyada henüz bir değişiklik kaydı yok."
              : "Bu dalda henüz bir değişiklik kaydı yok. İlk dosyayı eklediğinizde burada görünecek."
          }
          action={
            pathFilter ? (
              <Button variant="secondary" onClick={onClearPath}>
                Tüm commitleri göster
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {status === "ready" && commits.length > 0 ? (
        <div className="space-y-4">
          <ul className="divide-y divide-line overflow-hidden rounded-container border border-line bg-surface">
            {commits.map((commit) => {
              const date = commitDate(commit);
              const author = commitAuthor(commit);
              const shortSha = commit.sha.slice(0, 7);
              const firstLine =
                commit.commit.message.split("\n")[0]?.trim() ||
                "(Commit mesajı yok)";

              return (
                <li key={commit.sha} className="flex items-stretch">
                  <button
                    type="button"
                    onClick={() => onOpenCommit(commit.sha)}
                    className="flex min-w-0 flex-1 items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
                  >
                    {commit.author?.avatar_url ? (
                      <img
                        src={commit.author.avatar_url}
                        alt=""
                        loading="lazy"
                        className="mt-0.5 h-8 w-8 shrink-0 rounded-full border border-line"
                      />
                    ) : (
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-subtle text-muted">
                        <UserRound aria-hidden="true" className="h-4 w-4" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 break-words text-sm font-medium text-ink">
                        {firstLine}
                      </span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                        <span className="font-medium">{author}</span>
                        {date ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <time
                              dateTime={date}
                              title={formatAbsoluteDate(date)}
                            >
                              {formatUpdatedAt(date)}
                            </time>
                          </>
                        ) : null}
                      </span>
                    </span>
                    <span className="ml-auto shrink-0 font-mono text-xs text-muted">
                      {shortSha}
                    </span>
                  </button>
                  <a
                    href={commit.html_url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${shortSha} commit'ini GitHub'da aç`}
                    title="GitHub'da aç"
                    className="flex w-11 shrink-0 items-center justify-center border-l border-line text-muted transition-colors hover:bg-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
                  >
                    <ExternalLink aria-hidden="true" className="h-4 w-4" />
                  </a>
                </li>
              );
            })}
          </ul>

          {loadMoreError ? (
            <Alert tone="danger" title="Daha fazla commit yüklenemedi">
              <p>{loadMoreError}</p>
            </Alert>
          ) : null}

          {hasMore ? (
            <div className="flex justify-center">
              <Button
                variant="secondary"
                onClick={() => {
                  void loadMore();
                }}
                disabled={loadingMore}
              >
                {loadingMore ? <Spinner /> : null}
                {loadingMore ? "Yükleniyor…" : "Daha fazla"}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function CommitsTab({
  owner,
  repo,
  branch,
  pathFilter,
  token,
  commitSha,
  onOpenCommit,
  onBackToCommits,
  onClearPath,
  onOpenToken,
}: {
  owner: string;
  repo: string;
  branch: string;
  pathFilter: string;
  token: string | null;
  commitSha: string | null;
  onOpenCommit: (sha: string) => void;
  onBackToCommits: () => void;
  onClearPath: () => void;
  onOpenToken: () => void;
}) {
  if (commitSha) {
    return (
      <CommitDetail
        owner={owner}
        repo={repo}
        sha={commitSha}
        token={token}
        onBack={onBackToCommits}
        onOpenToken={onOpenToken}
      />
    );
  }

  return (
    <CommitList
      owner={owner}
      repo={repo}
      branch={branch}
      pathFilter={pathFilter}
      token={token}
      onOpenCommit={onOpenCommit}
      onClearPath={onClearPath}
      onOpenToken={onOpenToken}
    />
  );
}
