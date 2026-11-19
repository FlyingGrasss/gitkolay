"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, FilePlus2, FolderOpen, Package } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Skeleton } from "@/components/ui/Skeleton";
import { VisibilityBadge } from "@/components/ui/Badge";
import { TokenModal } from "@/components/TokenModal";
import { useSession } from "@/components/SessionProvider";
import { BranchSwitcher } from "@/components/repo/BranchSwitcher";
import { FileEditor } from "@/components/repo/FileEditor";
import { FileTable } from "@/components/repo/FileTable";
import { NewFileModal } from "@/components/repo/NewFileModal";
import { PathTrail } from "@/components/repo/PathTrail";
import {
  GitHubApiError,
  getBranch,
  getErrorMessage,
  getRepository,
  getTree,
  listBranches,
} from "@/lib/github";
import {
  fileExtension,
  findTreeEntry,
  listDirectory,
  parentPath,
} from "@/lib/files";
import {
  formatAbsoluteDate,
  formatUpdatedAt,
} from "@/lib/format";
import type {
  GitHubBranch,
  GitHubRepo,
  GitHubTree,
} from "@/lib/types";

type LoadStatus = "idle" | "loading" | "ready" | "error";

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

  const [meta, setMeta] = useState<GitHubRepo | null>(null);
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [metaStatus, setMetaStatus] = useState<LoadStatus>("loading");
  const [metaError, setMetaError] = useState<string | null>(null);
  const [tree, setTree] = useState<GitHubTree | null>(null);
  const [treeStatus, setTreeStatus] = useState<LoadStatus>("idle");
  const [treeError, setTreeError] = useState<string | null>(null);
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const metaRequestId = useRef(0);
  const treeRequestId = useRef(0);

  const branch =
    branchParam || meta?.default_branch || branches[0]?.name || "";

  const loadRepository = useCallback(async () => {
    const requestId = metaRequestId.current + 1;
    metaRequestId.current = requestId;
    treeRequestId.current += 1;
    setMetaStatus("loading");
    setMetaError(null);
    setMeta(null);
    setBranches([]);
    setTree(null);
    setTreeStatus("idle");
    setTreeError(null);

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

  useEffect(() => {
    void loadRepository();
  }, [loadRepository]);

  const loadTree = useCallback(
    async (silent = false, force = false) => {
      const requestId = treeRequestId.current + 1;
      treeRequestId.current = requestId;

      if (!branch || (branches.length === 0 && !force)) {
        setTree(null);
        setTreeStatus("ready");
        setTreeError(null);
        return;
      }

      if (!silent) {
        setTreeStatus("loading");
        setTreeError(null);
      }

      try {
        const branchInfo = await getBranch(owner, repo, branch, token);
        const treeData = await getTree(
          owner,
          repo,
          branchInfo.commit.sha,
          token,
        );

        if (treeRequestId.current !== requestId) {
          return;
        }

        setTree(treeData);
        setTreeStatus("ready");
        setTreeError(null);
      } catch (error) {
        if (treeRequestId.current !== requestId) {
          return;
        }

        if (!silent) {
          setTreeError(getErrorMessage(error));
          setTreeStatus("error");
        }
      }
    },
    [owner, repo, branch, branches.length, token],
  );

  useEffect(() => {
    if (metaStatus !== "ready" || !meta) {
      return;
    }

    void loadTree();
  }, [metaStatus, meta, loadTree]);

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

  const buildRepoUrl = useCallback(
    (next: { branch?: string; path?: string }) => {
      const params = new URLSearchParams();
      params.set("owner", owner);
      params.set("repo", repo);

      const targetBranch = next.branch ?? branch;

      if (targetBranch) {
        params.set("branch", targetBranch);
      }

      if (next.path) {
        params.set("path", next.path);
      }

      return `/repo?${params.toString()}`;
    },
    [owner, repo, branch],
  );

  const navigatePath = useCallback(
    (nextPath: string) => {
      router.push(buildRepoUrl({ path: sanitizePath(nextPath) }), {
        scroll: true,
      });
    },
    [router, buildRepoUrl],
  );

  const handleBranchChange = (nextBranch: string) => {
    router.push(buildRepoUrl({ branch: nextBranch, path: "" }), {
      scroll: true,
    });
  };

  const pathEntry = useMemo(
    () => (tree && pathParam ? findTreeEntry(tree, pathParam) : undefined),
    [tree, pathParam],
  );

  const looksLikeFile = Boolean(pathParam && fileExtension(pathParam) !== "");
  const missingFile =
    pathParam !== "" &&
    !pathEntry &&
    (tree?.truncated === true || looksLikeFile);
  const isFileView = pathEntry?.type === "blob" || missingFile;
  const isSubmoduleView = pathEntry?.type === "commit";
  const isDirectoryView = pathParam === "" || pathEntry?.type === "tree";
  const isInvalidPath =
    treeStatus === "ready" &&
    pathParam !== "" &&
    !isFileView &&
    !isSubmoduleView &&
    !isDirectoryView;
  const currentDirectory = isFileView ? parentPath(pathParam) : pathParam;

  const entries = useMemo(() => {
    if (!tree || !isDirectoryView || isInvalidPath) {
      return [];
    }

    return listDirectory(tree, pathParam);
  }, [tree, isDirectoryView, isInvalidPath, pathParam]);

  const handleFileCreated = async (createdPath: string) => {
    await loadTree(true, true);
    navigatePath(createdPath);
  };

  const handleFileDeleted = () => {
    navigatePath(parentPath(pathParam));
    void loadTree(true, true);
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

  const isEmptyRepo = treeStatus === "ready" && (!tree || tree.tree.length === 0);

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

          <div className="flex flex-wrap items-start gap-3">
            <BranchSwitcher
              branches={branches}
              branch={branch}
              disabled={metaStatus !== "ready"}
              onChange={handleBranchChange}
            />
            <span
              className="inline-block pt-[1.65rem]"
              title={!token ? "Yazmak için token gerekir" : undefined}
            >
              <Button
                variant="secondary"
                onClick={() => setNewFileOpen(true)}
                disabled={!token || !branch}
                aria-describedby={!token ? "repo-write-hint" : undefined}
              >
                <FilePlus2 aria-hidden="true" className="h-4 w-4" />
                Yeni dosya
              </Button>
            </span>
          </div>
        </div>

        {!token ? (
          <Alert tone="info" title="Salt görünüm" className="mt-6">
            <p id="repo-write-hint">
              Yazmak için token gerekir. Dosya düzenlemek, yeni dosya eklemek
              veya silmek için hesabınızı bağlayın.
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

        <div className="mt-6 border-t border-line pt-5">
          <PathTrail path={pathParam} onNavigate={navigatePath} />

          <div className="mt-5" aria-busy={treeStatus === "loading" ? true : undefined}>
            {treeStatus === "loading" ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-64 w-full rounded-container" />
                <span className="sr-only">Dosyalar yükleniyor…</span>
              </div>
            ) : null}

            {treeStatus === "error" ? (
              <ErrorNotice
                title="Dosyalar yüklenemedi"
                message={treeError ?? "Dosya listesi yüklenemedi."}
                onRetry={() => {
                  void loadTree();
                }}
              >
                <p>
                  Sürüm mevcut değilse yukarıdan başka bir sürüm seçmeyi
                  deneyin.
                </p>
              </ErrorNotice>
            ) : null}

            {treeStatus === "ready" && isFileView ? (
              <FileEditor
                key={`${owner}/${repo}/${branch}/${pathParam}`}
                owner={owner}
                repo={repo}
                branch={branch}
                path={pathParam}
                token={token}
                user={user}
                onBack={() => navigatePath(parentPath(pathParam))}
                onDeleted={handleFileDeleted}
                onSaved={() => {
                  void loadTree(true, true);
                }}
                onOpenToken={() => setTokenModalOpen(true)}
              />
            ) : null}

            {treeStatus === "ready" && isSubmoduleView ? (
              <EmptyState
                icon={<Package aria-hidden="true" className="h-8 w-8" />}
                title="Alt modül"
                description="Bu öğe ayrı bir depoyu gösteriyor. GitKolay'ın bu sürümünde alt modüller düzenlenemez."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => navigatePath(parentPath(pathParam))}
                  >
                    Klasöre dön
                  </Button>
                }
              />
            ) : null}

            {treeStatus === "ready" && isInvalidPath ? (
              <EmptyState
                icon={<FolderOpen aria-hidden="true" className="h-8 w-8" />}
                title="Bulunamadı."
                description="Bu yol seçili sürümde yok. Dosya silinmiş veya adı değişmiş olabilir."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => navigatePath(parentPath(pathParam))}
                  >
                    Klasöre dön
                  </Button>
                }
              />
            ) : null}

            {treeStatus === "ready" &&
            isDirectoryView &&
            !isInvalidPath &&
            !isFileView ? (
              <div className="space-y-4">
                {tree?.truncated ? (
                  <Alert tone="warning">
                    Depo çok büyük olduğu için dosya listesi yalnızca kısmen
                    gösteriliyor.
                  </Alert>
                ) : null}

                {isEmptyRepo || entries.length === 0 ? (
                  <EmptyState
                    icon={<FolderOpen aria-hidden="true" className="h-8 w-8" />}
                    title={
                      isEmptyRepo ? "Bu depo henüz boş" : "Bu klasör boş"
                    }
                    description={
                      isEmptyRepo
                        ? "İlk dosyayı ekleyerek başlayın."
                        : "Bu klasörde dosya yok. Yeni bir dosya ekleyebilirsiniz."
                    }
                    action={
                      token ? (
                        <Button onClick={() => setNewFileOpen(true)}>
                          <FilePlus2 aria-hidden="true" className="h-4 w-4" />
                          Yeni dosya
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          onClick={() => setTokenModalOpen(true)}
                        >
                          Token bağla
                        </Button>
                      )
                    }
                  />
                ) : (
                  <FileTable entries={entries} onOpen={navigatePath} />
                )}
              </div>
            ) : null}
          </div>
        </div>
      </main>

      <NewFileModal
        open={newFileOpen}
        token={token}
        user={user}
        owner={owner}
        repo={repo}
        branch={branch}
        initialDirectory={currentDirectory}
        onClose={() => setNewFileOpen(false)}
        onCreated={handleFileCreated}
      />
      <TokenModal
        open={tokenModalOpen}
        onClose={() => setTokenModalOpen(false)}
      />
    </>
  );
}
