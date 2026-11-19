"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  GitCommitHorizontal,
  Minus,
  Plus,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiErrorNotice } from "@/components/repo/ApiErrorNotice";
import { getCommit } from "@/lib/github";
import { formatAbsoluteDate, formatUpdatedAt } from "@/lib/format";
import type { GitHubCommitDetail } from "@/lib/types";

const PATCH_LIMIT = 4000;

const STATUS_LABELS: Record<string, string> = {
  added: "Eklendi",
  modified: "Değiştirildi",
  removed: "Silindi",
  renamed: "Yeniden adlandırıldı",
  copied: "Kopyalandı",
  changed: "Değiştirildi",
  unchanged: "Aynı kaldı",
};

function statusClasses(status: string): string {
  if (status === "added") {
    return "border-success-line bg-success-soft text-success";
  }

  if (status === "removed") {
    return "border-danger-line bg-danger-soft text-danger";
  }

  return "border-line bg-subtle text-muted";
}

function truncatePatch(patch: string): string {
  if (patch.length <= PATCH_LIMIT) {
    return patch;
  }

  return `${patch.slice(0, PATCH_LIMIT)}\n… (değişiklik kısaltıldı)`;
}

export function CommitDetail({
  owner,
  repo,
  sha,
  token,
  onBack,
  onOpenToken,
}: {
  owner: string;
  repo: string;
  sha: string;
  token: string | null;
  onBack: () => void;
  onOpenToken: () => void;
}) {
  const [commit, setCommit] = useState<GitHubCommitDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState<unknown>(null);
  const requestId = useRef(0);

  const loadCommit = useCallback(async () => {
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setStatus("loading");
    setError(null);
    setCommit(null);

    try {
      const data = await getCommit(owner, repo, sha, token);

      if (requestId.current !== currentRequest) {
        return;
      }

      setCommit(data);
      setStatus("ready");
    } catch (caught) {
      if (requestId.current !== currentRequest) {
        return;
      }

      setError(caught);
      setStatus("error");
    }
  }, [owner, repo, sha, token]);

  useEffect(() => {
    void loadCommit();
  }, [loadCommit]);

  if (status === "loading") {
    return (
      <div className="space-y-5" aria-busy="true">
        <Skeleton className="h-9 w-40 rounded-field" />
        <div className="rounded-container border border-line p-5">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="mt-3 h-4 w-1/2" />
          <Skeleton className="mt-6 h-20 w-full" />
        </div>
        <Skeleton className="h-48 w-full rounded-container" />
        <span className="sr-only">Commit yükleniyor…</span>
      </div>
    );
  }

  if (status === "error" || !commit) {
    return (
      <div className="space-y-4">
        <ApiErrorNotice
          title="Commit açılamadı"
          error={error}
          token={token}
          onOpenToken={onOpenToken}
          onRetry={() => {
            void loadCommit();
          }}
        >
          <Button variant="secondary" size="sm" onClick={onBack}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Commitlere dön
          </Button>
        </ApiErrorNotice>
      </div>
    );
  }

  const authorDate =
    commit.commit.author?.date ?? commit.commit.committer?.date ?? "";
  const authorLogin =
    commit.author?.login ?? commit.commit.author?.name ?? "Bilinmeyen yazar";
  const messageLines = commit.commit.message.split("\n");
  const title = messageLines[0]?.trim() || "(Commit mesajı yok)";
  const messageBody = messageLines.slice(1).join("\n").trim();
  const shortSha = commit.sha.slice(0, 7);
  const files = commit.files ?? [];
  const additions =
    commit.stats?.additions ??
    files.reduce((total, file) => total + file.additions, 0);
  const deletions =
    commit.stats?.deletions ??
    files.reduce((total, file) => total + file.deletions, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Commitlere dön
        </Button>
        <a
          href={commit.html_url}
          target="_blank"
          rel="noreferrer"
          className={buttonClasses({ variant: "secondary", size: "sm" })}
        >
          <ExternalLink aria-hidden="true" className="h-4 w-4" />
          GitHub&apos;da aç
        </a>
      </div>

      <div className="rounded-container border border-line bg-surface p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-field border border-line bg-subtle text-muted">
            <GitCommitHorizontal aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="break-words text-xl font-semibold text-ink">
              {title}
            </h2>
            {messageBody ? (
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted">
                {messageBody}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4 text-sm text-muted">
          {commit.author?.avatar_url ? (
            <img
              src={commit.author.avatar_url}
              alt=""
              loading="lazy"
              className="h-6 w-6 rounded-full border border-line"
            />
          ) : null}
          <span className="font-medium text-ink">{authorLogin}</span>
          {authorDate ? (
            <span>
              <time
                dateTime={authorDate}
                title={formatAbsoluteDate(authorDate)}
              >
                {formatUpdatedAt(authorDate)}
              </time>
            </span>
          ) : null}
          <span className="font-mono text-xs" title={commit.sha}>
            {shortSha}
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-container border border-line bg-surface p-4">
          <p className="text-sm text-muted">Eklenen satır</p>
          <p className="mt-1 flex items-center gap-1.5 text-xl font-semibold text-success">
            <Plus aria-hidden="true" className="h-4 w-4" />
            {additions.toLocaleString("tr-TR")}
          </p>
        </div>
        <div className="rounded-container border border-line bg-surface p-4">
          <p className="text-sm text-muted">Silinen satır</p>
          <p className="mt-1 flex items-center gap-1.5 text-xl font-semibold text-danger">
            <Minus aria-hidden="true" className="h-4 w-4" />
            {deletions.toLocaleString("tr-TR")}
          </p>
        </div>
        <div className="rounded-container border border-line bg-surface p-4">
          <p className="text-sm text-muted">Değişen dosya</p>
          <p className="mt-1 flex items-center gap-1.5 text-xl font-semibold text-ink">
            <FileText aria-hidden="true" className="h-4 w-4" />
            {files.length.toLocaleString("tr-TR")}
          </p>
        </div>
      </div>

      <section aria-labelledby="commit-files-heading" className="space-y-3">
        <div>
          <h3
            id="commit-files-heading"
            className="text-lg font-semibold text-ink"
          >
            Değişen dosyalar
          </h3>
          <p className="mt-1 text-sm text-muted">
            Bir dosyanın değişikliklerini görmek için altındaki başlığı açın.
          </p>
        </div>

        {files.length === 0 ? (
          <EmptyState
            title="Dosya değişikliği yok"
            description="Bu commit için dosya bazlı değişiklik bilgisi bulunamadı."
          />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-container border border-line bg-surface">
            {files.map((file) => (
              <li key={`${file.filename}-${file.status}`} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-all font-mono text-sm font-medium text-ink">
                      {file.filename}
                    </p>
                    {file.previous_filename ? (
                      <p className="mt-1 break-all text-xs text-muted">
                        Önceki ad: {file.previous_filename}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 font-medium ${statusClasses(file.status)}`}
                    >
                      {STATUS_LABELS[file.status] ?? file.status}
                    </span>
                    <span className="font-medium text-success">
                      +{file.additions.toLocaleString("tr-TR")}
                    </span>
                    <span className="font-medium text-danger">
                      −{file.deletions.toLocaleString("tr-TR")}
                    </span>
                  </div>
                </div>

                {file.patch ? (
                  <details className="mt-3 rounded-field border border-line bg-subtle">
                    <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus">
                      Değişiklikleri göster
                    </summary>
                    <pre className="max-h-[28rem] overflow-auto border-t border-line px-3 py-3 font-mono text-xs leading-5 text-ink">
                      {truncatePatch(file.patch)}
                    </pre>
                  </details>
                ) : (
                  <p className="mt-3 text-sm text-muted">
                    Bu dosya için metin değişikliği gösterilemiyor. İkili
                    dosya olabilir.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Alert tone="info" title="Commit nedir?">
        <p>
          Commit, depodaki bir değişikliğin kaydıdır. Her commit; neyin
          değiştiğini, kimin değiştirdiğini ve ne zaman değiştiğini saklar.
        </p>
      </Alert>
    </div>
  );
}
