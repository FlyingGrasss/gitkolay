"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Skeleton";
import { Alert } from "@/components/ui/Alert";
import {
  FieldError,
  helpClasses,
  inputClasses,
  labelClasses,
  textareaClasses,
} from "@/components/ui/form";
import { encodeUtf8ToBase64 } from "@/lib/base64";
import {
  GitHubApiError,
  commitIdentityFor,
  getErrorMessage,
  putContents,
} from "@/lib/github";
import {
  isValidFilePath,
  normalizeFilePath,
} from "@/lib/files";
import type { GitHubUser } from "@/lib/types";

export function NewFileModal({
  open,
  token,
  user,
  owner,
  repo,
  branch,
  initialDirectory,
  onClose,
  onCreated,
}: {
  open: boolean;
  token: string | null;
  user: GitHubUser | null;
  owner: string;
  repo: string;
  branch: string;
  initialDirectory: string;
  onClose: () => void;
  onCreated: (path: string) => Promise<void>;
}) {
  const [path, setPath] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [pathError, setPathError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const pathId = useId();
  const contentId = useId();
  const messageId = useId();
  const pathHelpId = useId();
  const pathErrorId = useId();
  const contentHelpId = useId();
  const messageHelpId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const directory = initialDirectory.replace(/^\/+|\/+$/g, "");
    setPath(directory ? `${directory}/` : "");
    setContent("");
    setMessage("");
    setPending(false);
    setPathError(null);
    setFormError(null);
  }, [open, initialDirectory]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedPath = normalizeFilePath(path);

    if (!normalizedPath) {
      setPathError("Dosya yolu gerekli.");
      return;
    }

    if (!isValidFilePath(normalizedPath)) {
      setPathError(
        "Geçerli bir dosya yolu yazın. '..' ve '.git' kullanılamaz.",
      );
      return;
    }

    if (!branch) {
      setFormError("Bu depo için görüntülenebilir bir sürüm bulunamadı.");
      return;
    }

    if (!token || !user) {
      setFormError("Yazmak için token gerekir.");
      return;
    }

    setPathError(null);
    setFormError(null);
    setPending(true);

    try {
      await putContents(token, owner, repo, normalizedPath, {
        message:
          message.trim() || `GitKolay: ${normalizedPath} oluşturuldu`,
        content: encodeUtf8ToBase64(content),
        branch,
        committer: commitIdentityFor(user),
      });

      toast.success("Dosya oluşturuldu.");
      await onCreated(normalizedPath);
      onClose();
    } catch (error) {
      if (error instanceof GitHubApiError && error.status === 422) {
        const detail = error.detail?.toLowerCase() ?? "";

        if (detail.includes("sha")) {
          setFormError(
            "Bu yolda zaten bir dosya var. Var olan dosyayı listeden açıp düzenleyin.",
          );
        } else {
          setFormError(getErrorMessage(error));
        }
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
      title="Yeni dosya"
      description="Yeni dosya doğrudan seçili sürüme eklenir."
      dismissDisabled={pending}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Vazgeç
          </Button>
          <Button type="submit" form="new-file-form" disabled={pending}>
            {pending ? <Spinner /> : <FilePlus2 aria-hidden="true" className="h-4 w-4" />}
            {pending ? "Oluşturuluyor…" : "Dosyayı oluştur"}
          </Button>
        </div>
      }
    >
      <form
        id="new-file-form"
        onSubmit={handleSubmit}
        className="space-y-5"
        noValidate
      >
        <div>
          <label htmlFor={pathId} className={labelClasses}>
            Dosya yolu <span className="font-normal text-muted">(gerekli)</span>
          </label>
          <input
            id={pathId}
            value={path}
            onChange={(event) => {
              setPath(event.target.value);
              if (pathError) {
                setPathError(null);
              }
            }}
            data-autofocus
            autoComplete="off"
            spellCheck={false}
            required
            placeholder="notlar/yeni-dosya.md"
            aria-describedby={pathError ? `${pathHelpId} ${pathErrorId}` : pathHelpId}
            aria-invalid={pathError ? true : undefined}
            aria-required="true"
            className={inputClasses()}
            disabled={pending}
          />
          <p id={pathHelpId} className={helpClasses}>
            Klasörleri eğik çizgi (/) ile ayırın. Örn. notlar/yeni-dosya.md
          </p>
          {pathError ? <FieldError id={pathErrorId}>{pathError}</FieldError> : null}
        </div>

        <div>
          <label htmlFor={contentId} className={labelClasses}>
            İçerik
          </label>
          <textarea
            id={contentId}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={8}
            aria-describedby={contentHelpId}
            placeholder="Dosya boş başlayabilir."
            className={textareaClasses("min-h-[10rem]")}
            disabled={pending}
          />
          <p id={contentHelpId} className={helpClasses}>
            Şimdilik boş bırakabilirsiniz; sonra düzenleyebilirsiniz.
          </p>
        </div>

        <div>
          <label htmlFor={messageId} className={labelClasses}>
            Kayıt notu{" "}
            <span className="font-normal text-muted">(isteğe bağlı)</span>
          </label>
          <input
            id={messageId}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            aria-describedby={messageHelpId}
            placeholder={`GitKolay: ${normalizeFilePath(path) || "dosya"} oluşturuldu`}
            className={inputClasses()}
            disabled={pending}
          />
          <p id={messageHelpId} className={helpClasses}>
            Boş bırakırsanız otomatik bir açıklama eklenir.
          </p>
        </div>

        {formError ? <Alert tone="danger">{formError}</Alert> : null}
      </form>
    </Modal>
  );
}
