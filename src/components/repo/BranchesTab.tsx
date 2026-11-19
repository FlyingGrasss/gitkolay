"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import {
  Check,
  GitBranch,
  GitBranchPlus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { NewBranchModal } from "@/components/repo/NewBranchModal";
import { TokenHint } from "@/components/repo/TokenHint";
import { deleteBranchRef, getErrorMessage } from "@/lib/github";
import type { GitHubBranch } from "@/lib/types";

export function BranchesTab({
  owner,
  repo,
  branches,
  currentBranch,
  defaultBranch,
  token,
  onSwitchBranch,
  onRefreshBranches,
  onOpenToken,
}: {
  owner: string;
  repo: string;
  branches: GitHubBranch[];
  currentBranch: string;
  defaultBranch: string;
  token: string | null;
  onSwitchBranch: (branch: string) => void;
  onRefreshBranches: () => Promise<GitHubBranch[]>;
  onOpenToken: () => void;
}) {
  const [newBranchOpen, setNewBranchOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GitHubBranch | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!token || !deleteTarget) {
      return;
    }

    const target = deleteTarget;
    setDeletePending(true);
    setDeleteError(null);

    try {
      await deleteBranchRef(token, owner, repo, target.name);
      toast.success(
        `${target.name} dalı silindi. Commit'ler korunuyor.`,
      );
      setDeleteTarget(null);

      try {
        const remaining = await onRefreshBranches();

        if (target.name === currentBranch) {
          const fallback =
            remaining.find((branch) => branch.name === defaultBranch)?.name ??
            remaining[0]?.name;

          if (fallback) {
            onSwitchBranch(fallback);
          }
        }
      } catch {
        toast.error(
          "Dal silindi ancak liste yenilenemedi. Sayfayı yenileyin.",
        );
      }
    } catch (error) {
      setDeleteError(getErrorMessage(error));
    } finally {
      setDeletePending(false);
    }
  };

  const createDisabledReason = !token
    ? "Dal oluşturmak için token gerekir"
    : branches.length === 0
      ? "Dal oluşturmak için önce bir commit gerekir"
      : undefined;

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">Dallar</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
            Dallar, aynı depoda farklı çalışma yollarıdır. Bir daldaki
            değişiklikler diğer dalları etkilemez.
          </p>
        </div>
        <span className="inline-block shrink-0" title={createDisabledReason}>
          <Button
            onClick={() => setNewBranchOpen(true)}
            disabled={!token || branches.length === 0}
            aria-describedby={!token ? "repo-write-hint" : undefined}
          >
            <GitBranchPlus aria-hidden="true" className="h-4 w-4" />
            Yeni dal
          </Button>
        </span>
      </div>

      {!token ? (
        <TokenHint onOpenToken={onOpenToken}>
          Dal oluşturmak veya silmek için token gerekir.
        </TokenHint>
      ) : null}

      {branches.length === 0 ? (
        <EmptyState
          icon={<GitBranch aria-hidden="true" className="h-8 w-8" />}
          title="Henüz dal yok."
          description="Bu depoda henüz bir commit yok. İlk dosyayı eklediğinizde varsayılan bir dal oluşur."
        />
      ) : (
        <>
          {branches.length === 1 ? (
            <Alert tone="info">
              <p>
                Bu depoda tek dal var. Yeni bir dal oluşturarak mevcut dalı
                etkilemeden değişiklik yapabilirsiniz.
              </p>
            </Alert>
          ) : null}

          <ul className="divide-y divide-line overflow-hidden rounded-container border border-line bg-surface">
            {branches.map((branch) => {
              const isCurrent = branch.name === currentBranch;
              const isDefault = branch.name === defaultBranch;
              const deleteDisabledReason = !token
                ? "Silmek için token gerekir"
                : isDefault
                  ? "Varsayılan dal silinemez"
                  : branch.protected
                    ? "Korumalı dal silinemez"
                    : undefined;

              return (
                <li
                  key={branch.name}
                  className="flex flex-wrap items-center gap-3 px-4 py-4"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-field border border-line bg-subtle text-muted">
                    <GitBranch aria-hidden="true" className="h-4 w-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="break-all text-sm font-medium text-ink">
                        {branch.name}
                      </span>
                      {isCurrent ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-success-line bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
                          <Check aria-hidden="true" className="h-3 w-3" />
                          Seçili
                        </span>
                      ) : null}
                      {isDefault ? (
                        <span className="rounded-full border border-line bg-subtle px-2 py-0.5 text-xs font-medium text-muted">
                          Varsayılan
                        </span>
                      ) : null}
                      {branch.protected ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-warning-line bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">
                          <ShieldCheck aria-hidden="true" className="h-3 w-3" />
                          Korumalı
                        </span>
                      ) : null}
                    </div>
                    <p
                      className="mt-1 font-mono text-xs text-muted"
                      title={branch.commit.sha}
                    >
                      Son commit: {branch.commit.sha.slice(0, 7)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onSwitchBranch(branch.name)}
                      disabled={isCurrent}
                    >
                      {isCurrent ? "Bu dal seçili" : "Bu dala geç"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger hover:bg-danger-soft"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteTarget(branch);
                      }}
                      disabled={Boolean(deleteDisabledReason)}
                      title={deleteDisabledReason}
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                      Sil
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="text-sm text-muted">
            Varsayılan ve korumalı dallar silinemez. Bir dal silindiğinde
            commit&apos;ler kaybolmaz.
          </p>
        </>
      )}

      <NewBranchModal
        open={newBranchOpen}
        token={token}
        owner={owner}
        repo={repo}
        branches={branches}
        currentBranch={currentBranch}
        onClose={() => setNewBranchOpen(false)}
        onCreated={async () => {
          await onRefreshBranches();
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Dalı sil"
        description="Bu dal silinecek. Bu daldaki commit'ler kaybolmaz; yalnızca dal etiketi kaldırılır. Commit'lere başka bir daldan veya SHA ile ulaşabilirsiniz."
        target={deleteTarget?.name}
        confirmLabel="Dalı sil"
        pendingLabel="Siliniyor…"
        pending={deletePending}
        error={deleteError}
        onCancel={() => {
          if (!deletePending) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        onConfirm={() => {
          void handleDelete();
        }}
      />
    </section>
  );
}
