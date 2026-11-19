"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { MessageSquare } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Skeleton";
import {
  FieldError,
  helpClasses,
  inputClasses,
  labelClasses,
} from "@/components/ui/form";
import {
  GitHubApiError,
  createIssue,
  getErrorMessage,
} from "@/lib/github";
import type { GitHubIssue } from "@/lib/types";

export function NewIssueModal({
  open,
  token,
  owner,
  repo,
  onClose,
  onCreated,
}: {
  open: boolean;
  token: string | null;
  owner: string;
  repo: string;
  onClose: () => void;
  onCreated: (issue: GitHubIssue) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const titleId = useId();
  const bodyId = useId();
  const titleHelpId = useId();
  const titleErrorId = useId();
  const bodyHelpId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    setTitle("");
    setBody("");
    setPending(false);
    setTitleError(null);
    setFormError(null);
  }, [open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setTitleError("Issue başlığı gerekli.");
      return;
    }

    if (!token) {
      setFormError("Issue açmak için token gerekir.");
      return;
    }

    setTitleError(null);
    setFormError(null);
    setPending(true);

    try {
      const issue = await createIssue(token, owner, repo, {
        title: trimmedTitle,
        body: body.trim(),
      });

      toast.success(`#${issue.number} numaralı issue açıldı.`);
      onCreated(issue);
      onClose();
    } catch (error) {
      if (error instanceof GitHubApiError && error.status === 410) {
        setFormError(
          "Bu depoda issue'lar kapalı. Depo ayarlarından issue'ları açmanız gerekir.",
        );
      } else {
        setFormError(getErrorMessage(error));
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Yeni issue"
      description="Bir sorun veya yapılacak iş için kısa bir başlık ve açıklama yazın."
      dismissDisabled={pending}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Vazgeç
          </Button>
          <Button type="submit" form="new-issue-form" disabled={pending}>
            {pending ? (
              <Spinner />
            ) : (
              <MessageSquare aria-hidden="true" className="h-4 w-4" />
            )}
            {pending ? "Açılıyor…" : "Issue'yu aç"}
          </Button>
        </div>
      }
    >
      <form
        id="new-issue-form"
        onSubmit={handleSubmit}
        className="space-y-5"
        noValidate
      >
        <div>
          <label htmlFor={titleId} className={labelClasses}>
            Başlık <span className="font-normal text-muted">(gerekli)</span>
          </label>
          <input
            id={titleId}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (titleError) {
                setTitleError(null);
              }
            }}
            data-autofocus
            autoComplete="off"
            required
            maxLength={256}
            aria-describedby={
              titleError ? `${titleHelpId} ${titleErrorId}` : titleHelpId
            }
            aria-invalid={titleError ? true : undefined}
            aria-required="true"
            placeholder="Örn. Ana sayfa bağlantısı çalışmıyor"
            className={inputClasses()}
            disabled={pending}
          />
          <p id={titleHelpId} className={helpClasses}>
            Kısa ve anlaşılır bir başlık yazın.
          </p>
          {titleError ? (
            <FieldError id={titleErrorId}>{titleError}</FieldError>
          ) : null}
        </div>

        <div>
          <label htmlFor={bodyId} className={labelClasses}>
            Açıklama{" "}
            <span className="font-normal text-muted">(isteğe bağlı)</span>
          </label>
          <textarea
            id={bodyId}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={8}
            aria-describedby={bodyHelpId}
            placeholder="Sorunu veya yapılacak işi kısaca anlatın."
            className={inputClasses("min-h-[10rem] resize-y leading-6")}
            disabled={pending}
          />
          <p id={bodyHelpId} className={helpClasses}>
            Düz metin olarak görünür. HTML etiketleri çalışmaz.
          </p>
        </div>

        {formError ? <Alert tone="danger">{formError}</Alert> : null}
      </form>
    </Modal>
  );
}
