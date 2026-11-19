"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CircleDot,
  FolderTree,
  GitBranch,
  GitCommitHorizontal,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Skeleton } from "@/components/ui/Skeleton";
import { VisibilityBadge } from "@/components/ui/Badge";
import { TokenModal } from "@/components/TokenModal";
import { useSession } from "@/components/SessionProvider";
import { BranchSwitcher } from "@/components/repo/BranchSwitcher";
import { BranchesTab } from "@/components/repo/BranchesTab";
import { CodeTab } from "@/components/repo/CodeTab";
import { CommitsTab } from "@/components/repo/CommitsTab";
import { IssuesTab } from "@/components/repo/IssuesTab";
import { GitHubApiError, getErrorMessage, getRepository, listBranches } from "@/lib/github";
import { cx } from "@/lib/cx";
import { formatAbsoluteDate, formatUpdatedAt } from "@/lib/format";
import type { GitHubBranch, GitHubRepo } from "@/lib/types";

type LoadStatus = "idle" | "loading" | "ready" | "error";
type RepoTab = "code" | "commits" | "issues" | "branches";

const TAB_ITEMS = [
  { id: "code", label: "Kod", icon: FolderTree },
  { id: "commits", label: "Commitler", icon: GitCommitHorizontal },
  { id: "issues", label: "Issue'lar", icon: CircleDot },
  { id: "branches", label: "Dallar", icon: GitBranch },
] as const;

function resolveTab(value: string | null): RepoTab {
  if (value === "commits" || value === "issues" || value === "branches") {
    return value;
  }

  return "code";
}

function sanitizePath(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}

export function RepoPageSkeleton() {
  return (
    <main
      className="mx-auto max-w-wide px-4 py-8 sm:px-6 lg:px-8"
      aria-busy="true"
    >
      <Skeleton className="h-5 w-24" />
      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-10 w-80 max-w-full" />
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
        <Skeleton className="h-20 w-56 rounded-container" />
      </div>
      <Skeleton className="mt-8 h-8 w-full max-w-md" />
      <Skeleton className="mt-4 h-80 w-full rounded-container" />
      <span className="sr-only">Depo yükleniyor…</span>
    </main>
  );
}

export function RepoBrowser({ owner, repo }: { owner: string; repo: string }) {
  const { token, user } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchParam = (searchParams.get("branch") ?? "").trim();
  const pathParam = sanitizePath(searchParams.get("path") ?? "");
  const activeTab = resolveTab(searchParams.get("tab"));
  const commitParam = (searchParams.get("commit") ?? "").trim();
  const issueParamRaw = (searchParams.get("issue") ?? "").trim();
  const issueParam = /^\d+$/.test(issueParamRaw)
    ? Number(issueParamRaw)
    : null;

  const [meta, setMeta] = useState<GitHubRepo | null>(null);
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [metaStatus, setMetaStatus] = useState<LoadStatus>("loading");
  const [metaError, setMetaError] = useState<string | null>(null);
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const metaRequestId = useRef(0);

  const branch =
    branches.length === 0
      ? ""
      : branchParam || meta?.default_branch || branches[0]?.name || "";

  const loadRepository = useCallback(async () => {
    const requestId = metaRequestId.current + 1;
    metaRequestId.current = requestId;
    setMetaStatus("loading");
    setMetaError(null);
    setMeta(null);
    setBranches([]);

    try {
      const [repository, branchList] = await Promise.all([
        getRepository(owner, repo, token),
        listBranches(owner, repo, token).catch((error: unknown) => {
          // GitHub can report an empty repository as a missing git database.
          if (error instanceof GitHubApiError && error.status === 409) {
            return [] as GitHubBranch[];
          }

          throw error;
        }),
      ]);

      if (metaRequestId.current !== requestId) {
        return;
      }

      setMeta(repository);
      setBranches(branchList);
      setMetaStatus("ready");
    } catch (error) {
      if (metaRequestId.current !== requestId) {
        return;
      }

      setMetaError(getErrorMessage(error));
      setMetaStatus("error");
    }
  }, [owner, repo, token]);

  const refreshBranches = useCallback(async () => {
    try {
      const branchList = await listBranches(owner, repo, token);
      setBranches(branchList);
      return branchList;
    } catch (error) {
      if (error instanceof GitHubApiError && error.status === 409) {
        setBranches([]);
        return [] as GitHubBranch[];
      }

      throw error;
    }
  }, [owner, repo, token]);

  useEffect(() => {
    void loadRepository();
  }, [loadRepository]);

  useEffect(() => {
    if (metaStatus !== "ready" || branchParam || !branch) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("owner", owner);
    params.set("repo", repo);
    params.set("branch", branch);
    router.replace(`/repo?${params.toString()}`, { scroll: false });
  }, [
    metaStatus,
    branch,
    branchParam,
    router,
    searchParams,
    owner,
    repo,
  ]);

  const buildRepoHref = useCallback(
    (next: {
      tab?: RepoTab;
      branch?: string;
      path?: string;
      commit?: string;
      issue?: number;
    }) => {
      const tab = next.tab ?? activeTab;
      const params = new URLSearchParams();
      params.set("owner", owner);
      params.set("repo", repo);

      const targetBranch = next.branch ?? branch;

      if (targetBranch) {
        params.set("branch", targetBranch);
      }

      if (tab !== "code") {
        params.set("tab", tab);
      }

      if (next.path) {
        const normalizedPath = sanitizePath(next.path);

        if (normalizedPath) {
          params.set("path", normalizedPath);
        }
      }

      if (tab === "commits" && next.commit) {
        params.set("commit", next.commit);
      }

      if (tab === "issues" && typeof next.issue === "number") {
        params.set("issue", String(next.issue));
      }

      return `/repo?${params.toString()}`;
    },
    [activeTab, branch, owner, repo],
  );

  const tabHref = (tab: RepoTab) =>
    buildRepoHref({
      tab,
      path:
        tab === "code" || (tab === "commits" && activeTab === "commits")
          ? pathParam
          : undefined,
    });

  const navigateCodePath = useCallback(
    (nextPath: string) => {
      router.push(buildRepoHref({ tab: "code", path: sanitizePath(nextPath) }), {
        scroll: true,
      });
    },
    [router, buildRepoHref],
  );

  const historyHref = useCallback(
    (filePath: string) => buildRepoHref({ tab: "commits", path: filePath }),
    [buildRepoHref],
  );

  const handleBranchChange = (nextBranch: string) => {
    router.push(
      buildRepoHref({ tab: activeTab, branch: nextBranch, path: "" }),
      { scroll: true },
    );
  };

  if (metaStatus === "loading") {
    return <RepoPageSkeleton />;
  }

  if (metaStatus === "error" || !meta) {
    return (
      <>
        <main className="mx-auto max-w-wide px-4 py-10 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-field text-sm font-medium text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Depolarım
          </Link>
          <div className="mt-6 max-w-2xl">
            <ErrorNotice
              title="Depo açılamadı"
              message={metaError ?? "Depo yüklenemedi."}
              onRetry={() => {
                void loadRepository();
              }}
            >
              {!token ? (
                <p>
                  Bu depo özel olabilir. Özel depoları görüntülemek için token
                  bağlayın.
                </p>
              ) : null}
            </ErrorNotice>
            {!token ? (
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => setTokenModalOpen(true)}
              >
                Token bağla
              </Button>
            ) : null}
          </div>
        </main>
        <TokenModal
          open={tokenModalOpen}
          onClose={() => setTokenModalOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <main className="mx-auto max-w-wide px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-field text-sm font-medium text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Depolarım
        </Link>

        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <nav aria-label="Depo konumu">
              <h1 className="flex flex-wrap items-baseline gap-x-2 gap-y-2">
                <span className="break-all text-2xl font-bold tracking-tight text-muted sm:text-3xl">
                  {owner}
                </span>
                <span
                  aria-hidden="true"
                  className="text-2xl text-strong sm:text-3xl"
                >
                  /
                </span>
                <span className="break-all text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                  {repo}
                </span>
                {branch ? (
                  <span className="rounded-full border border-line bg-subtle px-2.5 py-1 font-mono text-sm font-medium text-ink">
                    @{branch}
                  </span>
                ) : null}
              </h1>
            </nav>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
              <VisibilityBadge isPrivate={meta.private} />
              <span>
                Güncellendi:{" "}
                <time
                  dateTime={meta.updated_at}
                  title={formatAbsoluteDate(meta.updated_at)}
                >
                  {formatUpdatedAt(meta.updated_at)}
                </time>
              </span>
            </div>

            {meta.description ? (
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
                {meta.description}
              </p>
            ) : null}
          </div>

          <BranchSwitcher
            branches={branches}
            branch={branch}
            disabled={metaStatus !== "ready" || branches.length === 0}
            onChange={handleBranchChange}
          />
        </div>

        {!token ? (
          <Alert tone="info" title="Salt görünüm" className="mt-6">
            <p id="repo-write-hint">
              Yazmak için token gerekir. Dosya düzenlemek, issue açmak, yorum
              yazmak, dal oluşturmak veya silmek için hesabınızı bağlayın.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => setTokenModalOpen(true)}
            >
              Token bağla
            </Button>
          </Alert>
        ) : null}

        <div className="mt-6 border-b border-line">
          <nav
            aria-label="Depo bölümleri"
            className="-mb-px flex gap-1 overflow-x-auto"
          >
            {TAB_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;

              return (
                <Link
                  key={item.id}
                  href={tabHref(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cx(
                    "inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus",
                    isActive
                      ? "border-ink text-ink"
                      : "border-transparent text-muted hover:border-line hover:text-ink",
                  )}
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-6">
          {activeTab === "code" ? (
            <CodeTab
              owner={owner}
              repo={repo}
              branch={branch}
              path={pathParam}
              token={token}
              user={user}
              historyHref={historyHref}
              onNavigatePath={navigateCodePath}
              onOpenToken={() => setTokenModalOpen(true)}
            />
          ) : null}

          {activeTab === "commits" ? (
            <CommitsTab
              owner={owner}
              repo={repo}
              branch={branch}
              pathFilter={pathParam}
              token={token}
              commitSha={commitParam || null}
              onOpenCommit={(sha) => {
                router.push(
                  buildRepoHref({
                    tab: "commits",
                    path: pathParam,
                    commit: sha,
                  }),
                  { scroll: true },
                );
              }}
              onBackToCommits={() => {
                router.push(
                  buildRepoHref({ tab: "commits", path: pathParam }),
                  { scroll: true },
                );
              }}
              onClearPath={() => {
                router.push(buildRepoHref({ tab: "commits" }), {
                  scroll: true,
                });
              }}
              onOpenToken={() => setTokenModalOpen(true)}
            />
          ) : null}

          {activeTab === "issues" ? (
            <IssuesTab
              owner={owner}
              repo={repo}
              token={token}
              issueNumber={issueParam}
              onOpenIssue={(number) => {
                router.push(
                  buildRepoHref({ tab: "issues", issue: number }),
                  { scroll: true },
                );
              }}
              onBackToIssues={() => {
                router.push(buildRepoHref({ tab: "issues" }), {
                  scroll: true,
                });
              }}
              onOpenToken={() => setTokenModalOpen(true)}
            />
          ) : null}

          {activeTab === "branches" ? (
            <BranchesTab
              owner={owner}
              repo={repo}
              branches={branches}
              currentBranch={branch}
              defaultBranch={meta.default_branch}
              token={token}
              onSwitchBranch={(nextBranch) => {
                router.push(
                  buildRepoHref({
                    tab: "code",
                    branch: nextBranch,
                    path: "",
                  }),
                  { scroll: true },
                );
              }}
              onRefreshBranches={refreshBranches}
              onOpenToken={() => setTokenModalOpen(true)}
            />
          ) : null}
        </div>
      </main>

      <TokenModal
        open={tokenModalOpen}
        onClose={() => setTokenModalOpen(false)}
      />
    </>
  );
}
