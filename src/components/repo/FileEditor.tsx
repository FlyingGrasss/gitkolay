"use client";

import { useCallback, useEffect, useId, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileText,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button, buttonClasses } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Skeleton, Spinner } from "@/components/ui/Skeleton";
import {
  helpClasses,
  inputClasses,
  labelClasses,
  textareaClasses,
} from "@/components/ui/form";
import { encodeUtf8ToBase64 } from "@/lib/base64";
import {
  GitHubApiError,
  NetworkError,
  commitIdentityFor,
  deleteContents,
  getContents,
  getErrorMessage,
  putContents,
} from "@/lib/github";
import {
  formatBytes,
  isImagePath,
  previewForFile,
  type FilePreview,
} from "@/lib/files";
import type { GitHubFileContent, GitHubUser } from "@/lib/types";

type EditorStatus = "loading" | "ready" | "error";

export function FileEditor({
  owner,
  repo,
  branch,
  path,
  token,
  user,
  onBack,
  onDeleted,
  onSaved,
  onOpenToken,
}: {
  owner: string;
  repo: string;
  branch: string;
  path: string;
  token: string | null;
  user: GitHubUser | null;
  onBack: () => void;
  onDeleted: () => void;
  onSaved?: () => void;
  onOpenToken: () => void;
}) {
  const [status, setStatus] = useState<EditorStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [file, setFile] = useState<GitHubFileContent | null>(null);
  const [preview, setPreview] = useState<FilePreview | null>(null);
  const [text, setText] = useState("");
  const [original, setOriginal] = useState("");
  const [sha, setSha] = useState("");
  const [message, setMessage] = useState(`GitKolay: ${path} güncellendi`);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isConflict, setIsConflict] = useState(false);
  const [commitUrl, setCommitUrl] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const contentId = useId();
  const contentHelpId = useId();
  const messageId = useId();
  const messageHelpId = useId();

  const fileName = path.split("/").pop() ?? path;
  const isText = preview?.kind === "text";
  const canWrite = Boolean(token && user);
  const canEdit = Boolean(canWrite && isText && !saving);
  const dirty = Boolean(isText && text !== original);

  const loadFile = useCallback(async () => {
    setStatus("loading");
    setLoadError(null);
    setActionError(null);
    setIsConflict(false);
    setCommitUrl(null);
    setFile(null);
    setPreview(null);

    try {
      const contents = await getContents(owner, repo, path, branch, token);

      if (Array.isArray(contents)) {
        setLoadError(
          "Bu yol bir klasör. Dosyaları görüntülemek için listeye dönün.",
        );
        setStatus("error");
        return;
      }

      const filePreview = previewForFile(contents, path);
      const initialText = filePreview.kind === "text" ? filePreview.text : "";

      setFile(contents);
      setPreview(filePreview);
      setSha(contents.sha);
      setText(initialText);
      setOriginal(initialText);
      setMessage(`GitKolay: ${path} güncellendi`);
      setStatus("ready");
    } catch (error) {
      setLoadError(getErrorMessage(error));
      setStatus("error");
    }
  }, [owner, repo, path, branch, token]);

  useEffect(() => {
    void loadFile();
  }, [loadFile]);

  const handleSave = async () => {
    if (!token || !user || !preview || preview.kind !== "text" || !dirty) {
      return;
    }

    setSaving(true);
    setActionError(null);
    setIsConflict(false);
    setCommitUrl(null);

    try {
      const result = await putContents(token, owner, repo, path, {
        message: message.trim() || `GitKolay: ${path} güncellendi`,
        content: encodeUtf8ToBase64(text),
        branch,
        sha,
        committer: commitIdentityFor(user),
      });

      if (result.content?.sha) {
        setSha(result.content.sha);
      }

      setOriginal(text);
      setCommitUrl(result.commit.html_url);
      toast.success(
        <span>
          Değişiklikler kaydedildi.{" "}
          <a
            href={result.commit.html_url}
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-4"
          >
            Kaydı görüntüle
          </a>
        </span>,
      );
      onSaved?.();
    } catch (error) {
      const messageText = getErrorMessage(error);
      setActionError(messageText);

      if (error instanceof GitHubApiError && error.status === 409) {
        setIsConflict(true);
      }

      if (error instanceof NetworkError) {
        toast.error(messageText);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !user) {
      setDeleteError("Yazmak için token gerekir.");
      return;
    }

    setDeletePending(true);
    setDeleteError(null);

    try {
      await deleteContents(token, owner, repo, path, {
        message: `GitKolay: ${path} silindi`,
        sha,
        branch,
        committer: commitIdentityFor(user),
      });
      setDeleteOpen(false);
      toast.success("Dosya silindi.");
      onDeleted();
    } catch (error) {
      const messageText = getErrorMessage(error);
      setDeleteError(messageText);

      if (error instanceof NetworkError) {
        toast.error(messageText);
      }
    } finally {
      setDeletePending(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="space-y-5" aria-busy="true">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-field" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-[26rem] w-full rounded-container" />
        <span className="sr-only">Dosya yükleniyor…</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="space-y-4">
        <ErrorNotice
          title="Dosya açılamadı"
          message={loadError ?? "Dosya yüklenemedi."}
          onRetry={() => {
            void loadFile();
          }}
        >
          <Button variant="secondary" size="sm" onClick={onBack}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Klasöre dön
          </Button>
        </ErrorNotice>
      </div>
    );
  }

  if (!file || !preview) {
    return null;
  }

  const imagePreviewUrl =
    preview.kind === "binary" && isImagePath(path) ? file.download_url : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-field border border-line bg-subtle text-muted">
            <FileText aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="break-all text-xl font-semibold text-ink">
              {fileName}
            </h2>
            <p className="mt-1 break-all text-sm text-muted">
              {path} · {formatBytes(file.size)}
              {isText ? ` · ${text.length.toLocaleString("tr-TR")} karakter` : null}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {file.download_url ? (
            <a
              href={file.download_url}
              target="_blank"
              rel="noreferrer"
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              İndir
            </a>
          ) : null}
          {file.html_url ? (
            <a
              href={file.html_url}
              target="_blank"
              rel="noreferrer"
              className={buttonClasses({ variant: "ghost", size: "sm" })}
            >
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
              GitHub&apos;da aç
            </a>
          ) : null}
        </div>
      </div>

      {!token ? (
        <Alert tone="info">
          <span>Yazmak için token gerekir.</span>{" "}
          <button
            type="button"
            onClick={onOpenToken}
            className="font-medium text-focus underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            Token bağla
          </button>
        </Alert>
      ) : null}

      {preview.kind === "binary" ? (
        <div className="rounded-container border border-line p-6">
          <div className="flex items-start gap-3">
            <FileText aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-muted" />
            <div>
              <h3 className="font-semibold text-ink">Salt okunur önizleme</h3>
              <p className="mt-1 text-sm leading-6 text-muted">
                {preview.reason}
              </p>
            </div>
          </div>

          {imagePreviewUrl ? (
            <div className="mt-5 flex justify-center overflow-auto rounded-container border border-line bg-subtle p-4">
              <img
                src={imagePreviewUrl}
                alt={`${fileName} önizlemesi`}
                className="max-h-[28rem] max-w-full object-contain"
              />
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onBack}>
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Klasöre dön
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-danger hover:bg-danger-soft"
              onClick={() => {
                setDeleteError(null);
                setDeleteOpen(true);
              }}
              disabled={!canWrite || saving}
              title={!token ? "Yazmak için token gerekir" : undefined}
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              Sil
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <label htmlFor={contentId} className={labelClasses}>
                Dosya içeriği
              </label>
              <span
                aria-live="polite"
                className={
                  dirty
                    ? "text-sm font-medium text-warning"
                    : "text-sm text-muted"
                }
              >
                {dirty ? "Kaydedilmemiş değişiklikler var." : "Tüm değişiklikler kaydedildi."}
              </span>
            </div>
            <textarea
              id={contentId}
              value={text}
              onChange={(event) => setText(event.target.value)}
              readOnly={!canEdit}
              spellCheck={false}
              aria-describedby={contentHelpId}
              className={textareaClasses(
                "mt-2 min-h-[26rem] resize-y font-mono text-sm leading-6",
              )}
            />
            <p id={contentHelpId} className={helpClasses}>
              Değişiklikler siz kaydedene kadar GitHub&apos;a gönderilmez.
            </p>
          </div>

          {isConflict && actionError ? (
            <Alert tone="danger" title="Dosya değişmiş">
              <p>{actionError}</p>
              <p className="mt-1 text-muted">
                Yeniden yüklerseniz bu sayfadaki kaydedilmemiş değişiklikler
                kaybolur.
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => {
                  void loadFile();
                }}
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                Dosyayı yeniden yükle
              </Button>
            </Alert>
          ) : null}

          {actionError && !isConflict ? (
            <Alert tone="danger" title="Kaydedilemedi">
              <p>{actionError}</p>
              {!token ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={onOpenToken}
                >
                  Token bağla
                </Button>
              ) : null}
            </Alert>
          ) : null}

          {commitUrl ? (
            <Alert tone="success" title="Değişiklikler kaydedildi">
              <a
                href={commitUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium underline underline-offset-4"
              >
                GitHub&apos;daki kaydı görüntüle
              </a>
            </Alert>
          ) : null}

          <div className="rounded-container border border-line p-5">
            <label htmlFor={messageId} className={labelClasses}>
              Kayıt notu{" "}
              <span className="font-normal text-muted">(commit mesajı)</span>
            </label>
            <input
              id={messageId}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              aria-describedby={messageHelpId}
              className={inputClasses("mt-2")}
              disabled={!canWrite || saving}
            />
            <p id={messageHelpId} className={helpClasses}>
              Kaydın kısa açıklaması. Varsayılan mesaj hazır.
            </p>

            <div className="mt-5 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setText(original)}
                  disabled={!dirty || saving}
                >
                  <RotateCcw aria-hidden="true" className="h-4 w-4" />
                  Değişiklikleri geri al
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger hover:bg-danger-soft"
                  onClick={() => {
                    setDeleteError(null);
                    setDeleteOpen(true);
                  }}
                  disabled={!canWrite || saving}
                  title={!token ? "Yazmak için token gerekir" : undefined}
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                  Sil
                </Button>
              </div>

              <div className="flex flex-col items-start gap-2 sm:items-end">
                <Button
                  onClick={() => {
                    void handleSave();
                  }}
                  disabled={!canEdit || !dirty}
                  title={
                    !token
                      ? "Yazmak için token gerekir"
                      : !dirty
                        ? "Kaydedilecek değişiklik yok"
                        : undefined
                  }
                >
                  {saving ? <Spinner /> : <Save aria-hidden="true" className="h-4 w-4" />}
                  {saving ? "Kaydediliyor…" : "Kaydet ve commit'le"}
                </Button>
                {!token ? (
                  <p className="text-sm text-muted">Yazmak için token gerekir.</p>
                ) : null}
              </div>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title="Dosyayı sil"
        description="Bu dosya seçili sürümden silinecek. Bu işlem geri alınamaz."
        target={path}
        confirmLabel="Dosyayı sil"
        pendingLabel="Siliniyor…"
        pending={deletePending}
        error={deleteError}
        onCancel={() => {
          if (!deletePending) {
            setDeleteOpen(false);
          }
        }}
        onConfirm={() => {
          void handleDelete();
        }}
      />
    </div>
  );
}
