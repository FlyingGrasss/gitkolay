"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CircleDot,
  ExternalLink,
  MessageSquare,
  Plus,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, Spinner } from "@/components/ui/Skeleton";
import { ApiErrorNotice } from "@/components/repo/ApiErrorNotice";
import { IssueDetail } from "@/components/repo/IssueDetail";
import { NewIssueModal } from "@/components/repo/NewIssueModal";
import { TokenHint } from "@/components/repo/TokenHint";
import { getErrorMessage, listIssues } from "@/lib/github";
import { formatAbsoluteDate, formatUpdatedAt } from "@/lib/format";
import type { GitHubIssue } from "@/lib/types";

const ISSUES_PAGE_SIZE = 25;

type IssueFilter = "open" | "closed";

function IssueList({
  owner,
  repo,
  token,
  filter,
  onFilterChange,
  onOpenIssue,
  onOpenToken,
  onNewIssue,
}: {
  owner: string;
  repo: string;
  token: string | null;
  filter: IssueFilter;
  onFilterChange: (filter: IssueFilter) => void;
  onOpenIssue: (number: number) => void;
  onOpenToken: () => void;
  onNewIssue: () => void;
}) {
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
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
    setStatus("loading");
    setError(null);
    setIssues([]);
    setPage(1);
    setHasMore(false);
    setLoadMoreError(null);
    setLoadingMore(false);

    try {
      const data = await listIssues(owner, repo, {
        state: filter,
        page: 1,
        token,
      });

      if (requestId.current !== currentRequest) {
        return;
      }

      setIssues(data.filter((issue) => !issue.pull_request));
      setHasMore(data.length === ISSUES_PAGE_SIZE);
      setStatus("ready");
    } catch (caught) {
      if (requestId.current !== currentRequest) {
        return;
      }

      setError(caught);
      setStatus("error");
    }
  }, [owner, repo, filter, token]);

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
      const data = await listIssues(owner, repo, {
        state: filter,
        page: nextPage,
        token,
      });

      if (requestId.current !== currentRequest) {
        return;
      }

      setIssues((previous) => [
        ...previous,
        ...data.filter((issue) => !issue.pull_request),
      ]);
      setPage(nextPage);
      setHasMore(data.length === ISSUES_PAGE_SIZE);
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

  const emptyTitle =
    filter === "open" ? "Açık issue yok." : "Kapalı issue yok.";

  return (
    <section className="space-y-5" aria-busy={status === "loading" || undefined}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">Issue&apos;lar</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
            Issue&apos;lar; yapılacak işleri, sorunları ve önerileri takip
            etmek için kullanılır.
          </p>
        </div>
        <span
          className="inline-block shrink-0"
          title={!token ? "Issue açmak için token gerekir" : undefined}
        >
          <Button
            onClick={onNewIssue}
            disabled={!token}
            aria-describedby={!token ? "repo-write-hint" : undefined}
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Yeni issue
          </Button>
        </span>
      </div>

      {!token ? (
        <TokenHint onOpenToken={onOpenToken}>
          Issue açmak veya yorum yazmak için token gerekir.
        </TokenHint>
      ) : null}

      <div
        role="group"
        aria-label="Issue durumu"
        className="inline-flex rounded-field border border-line bg-surface p-1"
      >
        <button
          type="button"
          aria-pressed={filter === "open"}
          onClick={() => onFilterChange("open")}
          className={
            filter === "open"
              ? "rounded-[0.375rem] bg-ink px-3 py-1.5 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              : "rounded-[0.375rem] px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          }
        >
          Açık
        </button>
        <button
          type="button"
          aria-pressed={filter === "closed"}
          onClick={() => onFilterChange("closed")}
          className={
            filter === "closed"
              ? "rounded-[0.375rem] bg-ink px-3 py-1.5 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              : "rounded-[0.375rem] px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          }
        >
          Kapalı
        </button>
      </div>

      {status === "loading" ? (
        <div className="space-y-3">
          <div className="space-y-3 rounded-container border border-line p-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <Skeleton className="h-5 w-5 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
          <span className="sr-only">Issue&apos;lar yükleniyor…</span>
        </div>
      ) : null}

      {status === "error" ? (
        <ApiErrorNotice
          title="Issue'lar yüklenemedi"
          error={error}
          token={token}
          onOpenToken={onOpenToken}
          onRetry={() => {
            void loadFirstPage();
          }}
        />
      ) : null}

      {status === "ready" && issues.length === 0 && !hasMore ? (
        <EmptyState
          icon={<CircleDot aria-hidden="true" className="h-8 w-8" />}
          title={emptyTitle}
          description={
            filter === "open"
              ? "Yeni bir issue açarak bir sorunu veya yapılacak işi kaydedebilirsiniz."
              : "Kapatılmış issue'lar burada listelenir."
          }
          action={
            filter === "open" ? (
              token ? (
                <Button onClick={onNewIssue}>
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Yeni issue
                </Button>
              ) : (
                <Button variant="secondary" onClick={onOpenToken}>
                  Token bağla
                </Button>
              )
            ) : undefined
          }
        />
      ) : null}

      {status === "ready" && (issues.length > 0 || hasMore) ? (
        <div className="space-y-4">
          {issues.length > 0 ? (
            <ul className="divide-y divide-line overflow-hidden rounded-container border border-line bg-surface">
            {issues.map((issue) => {
              const author = issue.user?.login ?? "Bilinmeyen";

              return (
                <li key={issue.id} className="flex items-stretch">
                  <button
                    type="button"
                    onClick={() => onOpenIssue(issue.number)}
                    className="flex min-w-0 flex-1 items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
                  >
                    <CircleDot
                      aria-hidden="true"
                      className={
                        issue.state === "open"
                          ? "mt-1 h-5 w-5 shrink-0 text-success"
                          : "mt-1 h-5 w-5 shrink-0 text-muted"
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-2">
                        <span className="font-mono text-xs text-muted">
                          #{issue.number}
                        </span>
                        <span className="break-words text-sm font-medium text-ink">
                          {issue.title}
                        </span>
                      </span>

                      {issue.labels.length > 0 ? (
                        <span className="mt-2 flex flex-wrap gap-1.5">
                          {issue.labels.map((label) => (
                            <span
                              key={label.id}
                              className="rounded-full border border-line bg-subtle px-2 py-0.5 text-xs font-medium text-muted"
                            >
                              {label.name}
                            </span>
                          ))}
                        </span>
                      ) : null}

                      <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                        <span className="font-medium">{author}</span>
                        <span aria-hidden="true">·</span>
                        <time
                          dateTime={issue.created_at}
                          title={formatAbsoluteDate(issue.created_at)}
                        >
                          {formatUpdatedAt(issue.created_at)}
                        </time>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare
                            aria-hidden="true"
                            className="h-3.5 w-3.5"
                          />
                          {issue.comments.toLocaleString("tr-TR")} yorum
                        </span>
                      </span>
                    </span>
                  </button>
                  <a
                    href={issue.html_url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`#${issue.number} issue'sunu GitHub'da aç`}
                    title="GitHub'da aç"
                    className="flex w-11 shrink-0 items-center justify-center border-l border-line text-muted transition-colors hover:bg-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
                  >
                    <ExternalLink aria-hidden="true" className="h-4 w-4" />
                  </a>
                </li>
              );
            })}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              Bu sayfada gösterilecek issue bulunamadı. Sonraki sayfayı
              deneyebilirsiniz.
            </p>
          )}

          {loadMoreError ? (
            <Alert tone="danger" title="Daha fazla issue yüklenemedi">
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

export function IssuesTab({
  owner,
  repo,
  token,
  issueNumber,
  onOpenIssue,
  onBackToIssues,
  onOpenToken,
}: {
  owner: string;
  repo: string;
  token: string | null;
  issueNumber: number | null;
  onOpenIssue: (number: number) => void;
  onBackToIssues: () => void;
  onOpenToken: () => void;
}) {
  const [filter, setFilter] = useState<IssueFilter>("open");
  const [reloadKey, setReloadKey] = useState(0);
  const [newIssueOpen, setNewIssueOpen] = useState(false);

  const handleIssueChanged = useCallback(() => {
    setReloadKey((value) => value + 1);
  }, []);

  return (
    <>
      {issueNumber ? (
        <IssueDetail
          owner={owner}
          repo={repo}
          number={issueNumber}
          token={token}
          onBack={onBackToIssues}
          onOpenToken={onOpenToken}
          onChanged={handleIssueChanged}
        />
      ) : (
        <IssueList
          key={reloadKey}
          owner={owner}
          repo={repo}
          token={token}
          filter={filter}
          onFilterChange={setFilter}
          onOpenIssue={onOpenIssue}
          onOpenToken={onOpenToken}
          onNewIssue={() => setNewIssueOpen(true)}
        />
      )}

      <NewIssueModal
        open={newIssueOpen}
        token={token}
        owner={owner}
        repo={repo}
        onClose={() => setNewIssueOpen(false)}
        onCreated={(issue) => {
          setFilter("open");
          handleIssueChanged();
          onOpenIssue(issue.number);
        }}
      />
    </>
  );
}
