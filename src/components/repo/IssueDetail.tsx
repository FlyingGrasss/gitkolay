"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CircleCheck,
  CircleSlash,
  ExternalLink,
  MessageSquare,
  Send,
  UserRound,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, Spinner } from "@/components/ui/Skeleton";
import { FieldError, helpClasses, inputClasses, labelClasses } from "@/components/ui/form";
import { ApiErrorNotice } from "@/components/repo/ApiErrorNotice";
import { TokenHint } from "@/components/repo/TokenHint";
import {
  createIssueComment,
  getErrorMessage,
  getIssue,
  listIssueComments,
  setIssueState,
} from "@/lib/github";
import { formatAbsoluteDate, formatUpdatedAt } from "@/lib/format";
import type { GitHubComment, GitHubIssue } from "@/lib/types";

const COMMENTS_PAGE_SIZE = 50;

function issueAuthor(issue: GitHubIssue): string {
  return issue.user?.login ?? "Bilinmeyen";
}

export function IssueDetail({
  owner,
  repo,
  number,
  token,
  onBack,
  onOpenToken,
  onChanged,
}: {
  owner: string;
  repo: string;
  number: number;
  token: string | null;
  onBack: () => void;
  onOpenToken: () => void;
  onChanged: () => void;
}) {
  const [issue, setIssue] = useState<GitHubIssue | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState<unknown>(null);
  const [comments, setComments] = useState<GitHubComment[]>([]);
  const [commentsStatus, setCommentsStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [commentsError, setCommentsError] = useState<unknown>(null);
  const [commentPage, setCommentPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [commentPending, setCommentPending] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [statePending, setStatePending] = useState(false);
  const [stateError, setStateError] = useState<string | null>(null);
  const issueRequestId = useRef(0);
  const commentsRequestId = useRef(0);
  const commentId = useId();
  const commentHelpId = useId();
  const commentErrorId = useId();

  const loadIssue = useCallback(async () => {
    const currentRequest = issueRequestId.current + 1;
    issueRequestId.current = currentRequest;
    setStatus("loading");
    setError(null);
    setIssue(null);
    setStateError(null);

    try {
      const data = await getIssue(owner, repo, number, token);

      if (issueRequestId.current !== currentRequest) {
        return;
      }

      setIssue(data);
      setStatus("ready");
    } catch (caught) {
      if (issueRequestId.current !== currentRequest) {
        return;
      }

      setError(caught);
      setStatus("error");
    }
  }, [owner, repo, number, token]);

  const loadFirstComments = useCallback(async () => {
    const currentRequest = commentsRequestId.current + 1;
    commentsRequestId.current = currentRequest;
    setCommentsStatus("loading");
    setCommentsError(null);
    setComments([]);
    setCommentPage(1);
    setHasMoreComments(false);
    setLoadingMoreComments(false);

    try {
      const data = await listIssueComments(owner, repo, number, {
        page: 1,
        token,
      });

      if (commentsRequestId.current !== currentRequest) {
        return;
      }

      setComments(data);
      setHasMoreComments(data.length === COMMENTS_PAGE_SIZE);
      setCommentsStatus("ready");
    } catch (caught) {
      if (commentsRequestId.current !== currentRequest) {
        return;
      }

      setCommentsError(caught);
      setCommentsStatus("error");
    }
  }, [owner, repo, number, token]);

  useEffect(() => {
    void loadIssue();
  }, [loadIssue]);

  useEffect(() => {
    void loadFirstComments();
  }, [loadFirstComments]);

  const loadMoreComments = async () => {
    if (loadingMoreComments || !hasMoreComments) {
      return;
    }

    const currentRequest = commentsRequestId.current;
    const nextPage = commentPage + 1;
    setLoadingMoreComments(true);

    try {
      const data = await listIssueComments(owner, repo, number, {
        page: nextPage,
        token,
      });

      if (commentsRequestId.current !== currentRequest) {
        return;
      }

      setComments((previous) => [...previous, ...data]);
      setCommentPage(nextPage);
      setHasMoreComments(data.length === COMMENTS_PAGE_SIZE);
    } catch (caught) {
      if (commentsRequestId.current === currentRequest) {
        setCommentsError(caught);
        setCommentsStatus("error");
      }
    } finally {
      if (commentsRequestId.current === currentRequest) {
        setLoadingMoreComments(false);
      }
    }
  };

  const handleToggleState = async () => {
    if (!token || !issue || statePending) {
      return;
    }

    const nextState = issue.state === "open" ? "closed" : "open";
    setStatePending(true);
    setStateError(null);

    try {
      const updated = await setIssueState(
        token,
        owner,
        repo,
        issue.number,
        nextState,
      );
      setIssue((previous) => (previous ? { ...previous, ...updated } : updated));
      toast.success(
        nextState === "closed" ? "Issue kapatıldı." : "Issue yeniden açıldı.",
      );
      onChanged();
    } catch (caught) {
      setStateError(getErrorMessage(caught));
    } finally {
      setStatePending(false);
    }
  };

  const handleCommentSubmit = async () => {
    if (!token || !issue || commentPending) {
      return;
    }

    const body = commentBody.trim();

    if (!body) {
      setCommentError("Yorum boş olamaz.");
      return;
    }

    setCommentPending(true);
    setCommentError(null);

    try {
      const created = await createIssueComment(
        token,
        owner,
        repo,
        issue.number,
        body,
      );
      setComments((previous) => [...previous, created]);
      setIssue((previous) =>
        previous
          ? { ...previous, comments: previous.comments + 1 }
          : previous,
      );
      setCommentBody("");
      toast.success("Yorum eklendi.");
      onChanged();
    } catch (caught) {
      setCommentError(getErrorMessage(caught));
    } finally {
      setCommentPending(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="space-y-5" aria-busy="true">
        <Skeleton className="h-9 w-44 rounded-field" />
        <div className="rounded-container border border-line p-5">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="mt-3 h-4 w-1/2" />
          <Skeleton className="mt-6 h-24 w-full" />
        </div>
        <Skeleton className="h-40 w-full rounded-container" />
        <span className="sr-only">Issue yükleniyor…</span>
      </div>
    );
  }

  if (status === "error" || !issue) {
    return (
      <div className="space-y-4">
        <ApiErrorNotice
          title="Issue açılamadı"
          error={error}
          token={token}
          onOpenToken={onOpenToken}
          onRetry={() => {
            void loadIssue();
          }}
        >
          <Button variant="secondary" size="sm" onClick={onBack}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Issue&apos;lara dön
          </Button>
        </ApiErrorNotice>
      </div>
    );
  }

  const isOpen = issue.state === "open";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Issue&apos;lara dön
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {token ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void handleToggleState();
              }}
              disabled={statePending}
            >
              {statePending ? (
                <Spinner />
              ) : isOpen ? (
                <CircleSlash aria-hidden="true" className="h-4 w-4" />
              ) : (
                <CircleCheck aria-hidden="true" className="h-4 w-4" />
              )}
              {statePending
                ? "İşleniyor…"
                : isOpen
                  ? "Issue'ı kapat"
                  : "Yeniden aç"}
            </Button>
          ) : (
            <span title="Issue durumunu değiştirmek için token gerekir">
              <Button variant="secondary" size="sm" disabled>
                {isOpen ? (
                  <CircleSlash aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <CircleCheck aria-hidden="true" className="h-4 w-4" />
                )}
                {isOpen ? "Issue'ı kapat" : "Yeniden aç"}
              </Button>
            </span>
          )}
          <a
            href={issue.html_url}
            target="_blank"
            rel="noreferrer"
            className={buttonClasses({ variant: "ghost", size: "sm" })}
          >
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
            GitHub&apos;da aç
          </a>
        </div>
      </div>

      {stateError ? (
        <Alert tone="danger" title="Issue durumu değiştirilemedi">
          <p>{stateError}</p>
        </Alert>
      ) : null}

      <div className="rounded-container border border-line bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted">#{issue.number}</p>
            <h2 className="mt-1 break-words text-xl font-semibold text-ink sm:text-2xl">
              {issue.title}
            </h2>
          </div>
          <span
            className={
              isOpen
                ? "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-success-line bg-success-soft px-3 py-1 text-xs font-medium text-success"
                : "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-subtle px-3 py-1 text-xs font-medium text-muted"
            }
          >
            {isOpen ? (
              <CircleCheck aria-hidden="true" className="h-3.5 w-3.5" />
            ) : (
              <CircleSlash aria-hidden="true" className="h-3.5 w-3.5" />
            )}
            {isOpen ? "Açık" : "Kapalı"}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
          {issue.user?.avatar_url ? (
            <img
              src={issue.user.avatar_url}
              alt=""
              loading="lazy"
              className="h-6 w-6 rounded-full border border-line"
            />
          ) : (
            <UserRound aria-hidden="true" className="h-5 w-5" />
          )}
          <span className="font-medium text-ink">{issueAuthor(issue)}</span>
          <span aria-hidden="true">·</span>
          <span>
            Açıldı:{" "}
            <time
              dateTime={issue.created_at}
              title={formatAbsoluteDate(issue.created_at)}
            >
              {formatUpdatedAt(issue.created_at)}
            </time>
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1.5">
            <MessageSquare aria-hidden="true" className="h-4 w-4" />
            {issue.comments.toLocaleString("tr-TR")} yorum
          </span>
        </div>

        {issue.labels.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Etiketler">
            {issue.labels.map((label) => (
              <li
                key={label.id}
                className="rounded-full border border-line bg-subtle px-2.5 py-0.5 text-xs font-medium text-muted"
              >
                {label.name}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <section aria-labelledby="issue-body-heading">
        <h3 id="issue-body-heading" className="text-lg font-semibold text-ink">
          Açıklama
        </h3>
        <div className="mt-3 rounded-container border border-line bg-surface p-5">
          {issue.body?.trim() ? (
            <p className="whitespace-pre-wrap break-words text-sm leading-7 text-ink">
              {issue.body}
            </p>
          ) : (
            <p className="text-sm text-muted">Açıklama eklenmemiş.</p>
          )}
        </div>
      </section>

      <section aria-labelledby="issue-comments-heading" className="space-y-4">
        <div>
          <h3
            id="issue-comments-heading"
            className="text-lg font-semibold text-ink"
          >
            Yorumlar ({issue.comments.toLocaleString("tr-TR")})
          </h3>
          <p className="mt-1 text-sm text-muted">
            Yorumlar düz metin olarak gösterilir.
          </p>
        </div>

        {commentsStatus === "loading" ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-24 w-full rounded-container" />
            <Skeleton className="h-24 w-full rounded-container" />
            <span className="sr-only">Yorumlar yükleniyor…</span>
          </div>
        ) : null}

        {commentsStatus === "error" && !loadingMoreComments ? (
          <ApiErrorNotice
            title="Yorumlar yüklenemedi"
            error={commentsError}
            token={token}
            onOpenToken={onOpenToken}
            onRetry={() => {
              void loadFirstComments();
            }}
          />
        ) : null}

        {commentsStatus === "ready" && comments.length === 0 ? (
          <EmptyState
            icon={<MessageSquare aria-hidden="true" className="h-7 w-7" />}
            title="Henüz yorum yok."
            description="İlk yorumu siz yazabilirsiniz."
          />
        ) : null}

        {comments.length > 0 ? (
          <ul className="space-y-3">
            {comments.map((comment) => {
              const author = comment.user?.login ?? "Bilinmeyen";

              return (
                <li
                  key={comment.id}
                  className="rounded-container border border-line bg-surface p-4"
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {comment.user?.avatar_url ? (
                      <img
                        src={comment.user.avatar_url}
                        alt=""
                        loading="lazy"
                        className="h-6 w-6 rounded-full border border-line"
                      />
                    ) : (
                      <UserRound
                        aria-hidden="true"
                        className="h-5 w-5 text-muted"
                      />
                    )}
                    <span className="font-medium text-ink">{author}</span>
                    <span aria-hidden="true" className="text-muted">
                      ·
                    </span>
                    <time
                      dateTime={comment.created_at}
                      title={formatAbsoluteDate(comment.created_at)}
                      className="text-muted"
                    >
                      {formatUpdatedAt(comment.created_at)}
                    </time>
                  </div>
                  {comment.body?.trim() ? (
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-ink">
                      {comment.body}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-muted">
                      (Yorum metni yok)
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}

        {hasMoreComments ? (
          <div className="flex justify-center">
            <Button
              variant="secondary"
              onClick={() => {
                void loadMoreComments();
              }}
              disabled={loadingMoreComments}
            >
              {loadingMoreComments ? <Spinner /> : null}
              {loadingMoreComments ? "Yükleniyor…" : "Daha fazla yorum"}
            </Button>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="new-comment-heading">
        <h3 id="new-comment-heading" className="text-lg font-semibold text-ink">
          Yorum yaz
        </h3>
        <div className="mt-3 rounded-container border border-line bg-surface p-5">
          <label htmlFor={commentId} className={labelClasses}>
            Yorumunuz
          </label>
          <textarea
            id={commentId}
            value={commentBody}
            onChange={(event) => {
              setCommentBody(event.target.value);
              if (commentError) {
                setCommentError(null);
              }
            }}
            rows={4}
            disabled={!token || commentPending}
            aria-describedby={
              commentError
                ? `${commentHelpId} ${commentErrorId}`
                : commentHelpId
            }
            aria-invalid={commentError ? true : undefined}
            placeholder={
              token
                ? "Düşüncenizi veya ek bilgiyi yazın."
                : "Yorum yazmak için token bağlayın."
            }
            className={inputClasses("mt-2 min-h-[7rem] resize-y leading-6")}
          />
          <p id={commentHelpId} className={helpClasses}>
            Düz metin olarak görünür. HTML etiketleri çalışmaz.
          </p>
          {commentError ? (
            <FieldError id={commentErrorId}>{commentError}</FieldError>
          ) : null}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {!token ? (
              <TokenHint onOpenToken={onOpenToken}>
                Yorum yazmak için token gerekir.
              </TokenHint>
            ) : (
              <p className="text-sm text-muted">
                Yorumunuz doğrudan GitHub&apos;a gönderilir.
              </p>
            )}
            <Button
              onClick={() => {
                void handleCommentSubmit();
              }}
              disabled={!token || commentPending || !commentBody.trim()}
              title={!token ? "Yorum yazmak için token gerekir" : undefined}
            >
              {commentPending ? (
                <Spinner />
              ) : (
                <Send aria-hidden="true" className="h-4 w-4" />
              )}
              {commentPending ? "Gönderiliyor…" : "Yorumu gönder"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
