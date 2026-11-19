"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FilePlus2, FolderOpen, Package } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Skeleton } from "@/components/ui/Skeleton";
import { FileEditor } from "@/components/repo/FileEditor";
import { FileTable } from "@/components/repo/FileTable";
import { NewFileModal } from "@/components/repo/NewFileModal";
import { PathTrail } from "@/components/repo/PathTrail";
import {
  getBranch,
  getErrorMessage,
  getTree,
} from "@/lib/github";
import {
  fileExtension,
  findTreeEntry,
  listDirectory,
  parentPath,
} from "@/lib/files";
import type { GitHubTree, GitHubUser } from "@/lib/types";

type LoadStatus = "idle" | "loading" | "ready" | "error";

export function CodeTab({
  owner,
  repo,
  branch,
  path,
  token,
  user,
  historyHref,
  onNavigatePath,
  onOpenToken,
}: {
  owner: string;
  repo: string;
  branch: string;
  path: string;
  token: string | null;
  user: GitHubUser | null;
  historyHref: (path: string) => string;
  onNavigatePath: (path: string) => void;
  onOpenToken: () => void;
}) {
  const [tree, setTree] = useState<GitHubTree | null>(null);
  const [treeStatus, setTreeStatus] = useState<LoadStatus>("loading");
  const [treeError, setTreeError] = useState<string | null>(null);
  const [newFileOpen, setNewFileOpen] = useState(false);
  const treeRequestId = useRef(0);

  const loadTree = useCallback(
    async (silent = false) => {
      const requestId = treeRequestId.current + 1;
      treeRequestId.current = requestId;

      if (!branch) {
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
    [owner, repo, branch, token],
  );

  useEffect(() => {
    void loadTree();
  }, [loadTree]);

  const pathEntry = useMemo(
    () => (tree && path ? findTreeEntry(tree, path) : undefined),
    [tree, path],
  );

  const looksLikeFile = Boolean(path && fileExtension(path) !== "");
  const missingFile =
    path !== "" && !pathEntry && (tree?.truncated === true || looksLikeFile);
  const isFileView = pathEntry?.type === "blob" || missingFile;
  const isSubmoduleView = pathEntry?.type === "commit";
  const isDirectoryView = path === "" || pathEntry?.type === "tree";
  const isInvalidPath =
    treeStatus === "ready" &&
    path !== "" &&
    !isFileView &&
    !isSubmoduleView &&
    !isDirectoryView;
  const currentDirectory = isFileView ? parentPath(path) : path;

  const entries = useMemo(() => {
    if (!tree || !isDirectoryView || isInvalidPath) {
      return [];
    }

    return listDirectory(tree, path);
  }, [tree, isDirectoryView, isInvalidPath, path]);

  const handleFileCreated = async (createdPath: string) => {
    await loadTree(true);
    onNavigatePath(createdPath);
  };

  const handleFileDeleted = () => {
    onNavigatePath(parentPath(path));
    void loadTree(true);
  };

  const isEmptyRepo =
    treeStatus === "ready" && (!tree || tree.tree.length === 0);
  const canCreateFile = Boolean(token && branch);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PathTrail path={path} onNavigate={onNavigatePath} />
        <span
          className="inline-block"
          title={
            !token
              ? "Yazmak için token gerekir"
              : !branch
                ? "Önce bir dal gerekir"
                : undefined
          }
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setNewFileOpen(true)}
            disabled={!canCreateFile}
            aria-describedby={!token ? "repo-write-hint" : undefined}
          >
            <FilePlus2 aria-hidden="true" className="h-4 w-4" />
            Yeni dosya
          </Button>
        </span>
      </div>

      <div
        className="mt-5"
        aria-busy={treeStatus === "loading" ? true : undefined}
      >
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
              Sürüm mevcut değilse yukarıdan başka bir sürüm seçmeyi deneyin.
            </p>
          </ErrorNotice>
        ) : null}

        {treeStatus === "ready" && isFileView ? (
          <FileEditor
            key={`${owner}/${repo}/${branch}/${path}`}
            owner={owner}
            repo={repo}
            branch={branch}
            path={path}
            token={token}
            user={user}
            historyHref={historyHref(path)}
            onBack={() => onNavigatePath(parentPath(path))}
            onDeleted={handleFileDeleted}
            onSaved={() => {
              void loadTree(true);
            }}
            onOpenToken={onOpenToken}
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
                onClick={() => onNavigatePath(parentPath(path))}
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
                onClick={() => onNavigatePath(parentPath(path))}
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
                title={isEmptyRepo ? "Bu depo henüz boş" : "Bu klasör boş"}
                description={
                  isEmptyRepo
                    ? "İlk dosyayı ekleyerek başlayın."
                    : "Bu klasörde dosya yok. Yeni bir dosya ekleyebilirsiniz."
                }
                action={
                  token ? (
                    <Button
                      onClick={() => setNewFileOpen(true)}
                      disabled={!branch}
                    >
                      <FilePlus2 aria-hidden="true" className="h-4 w-4" />
                      Yeni dosya
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={onOpenToken}
                    >
                      Token bağla
                    </Button>
                  )
                }
              />
            ) : (
              <FileTable
                entries={entries}
                onOpen={onNavigatePath}
                historyHref={historyHref}
              />
            )}
          </div>
        ) : null}
      </div>

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
    </>
  );
}
