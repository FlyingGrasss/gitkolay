"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { FolderPlus } from "lucide-react";
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
import {
  GitHubApiError,
  createRepository,
  getErrorMessage,
} from "@/lib/github";
import type { GitHubRepo } from "@/lib/types";

const NAME_PATTERN = /^[A-Za-z0-9._-]+$/;

export function NewRepoModal({
  open,
  token,
  onClose,
  onCreated,
}: {
  open: boolean;
  token: string | null;
  onClose: () => void;
  onCreated: (repo: GitHubRepo) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [pending, setPending] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const nameId = useId();
  const descriptionId = useId();
  const nameHelpId = useId();
  const nameErrorId = useId();
  const descriptionHelpId = useId();
  const privateHelpId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    setName("");
    setDescription("");
    setIsPrivate(false);
    setPending(false);
    setNameError(null);
    setFormError(null);
  }, [open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setNameError("Depo adı gerekli.");
      return;
    }

    if (!NAME_PATTERN.test(trimmedName)) {
      setNameError(
        "Yalnızca harf, rakam, nokta, tire ve alt çizgi kullanabilirsiniz.",
      );
      return;
    }

    if (trimmedName.length > 100) {
      setNameError("Depo adı 100 karakterden uzun olamaz.");
      return;
    }

    if (!token) {
      setFormError("Yazmak için token gerekir.");
      return;
    }

    setNameError(null);
    setFormError(null);
    setPending(true);

    try {
      const repo = await createRepository(token, {
        name: trimmedName,
        description: description.trim(),
        private: isPrivate,
      });

      toast.success(`${repo.name} oluşturuldu.`);
      onCreated(repo);
    } catch (error) {
      if (error instanceof GitHubApiError && error.status === 422) {
        const detail = error.detail?.toLowerCase() ?? "";

        if (detail.includes("already exists")) {
          setNameError("Bu isimde bir depo zaten var.");
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
      title="Yeni depo"
      description="Depo adı ve görünürlük daha sonra GitHub ayarlarından değiştirilebilir."
      dismissDisabled={pending}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Vazgeç
          </Button>
          <Button type="submit" form="new-repo-form" disabled={pending}>
            {pending ? <Spinner /> : <FolderPlus aria-hidden="true" className="h-4 w-4" />}
            {pending ? "Oluşturuluyor…" : "Depoyu oluştur"}
          </Button>
        </div>
      }
    >
      <form id="new-repo-form" onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor={nameId} className={labelClasses}>
            Depo adı <span className="font-normal text-muted">(gerekli)</span>
          </label>
          <input
            id={nameId}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (nameError) {
                setNameError(null);
              }
            }}
            data-autofocus
            autoComplete="off"
            required
            aria-describedby={nameError ? `${nameHelpId} ${nameErrorId}` : nameHelpId}
            aria-invalid={nameError ? true : undefined}
            aria-required="true"
            placeholder="ornek-proje"
            className={inputClasses()}
            disabled={pending}
          />
          <p id={nameHelpId} className={helpClasses}>
            Kısa ve anlaşılır bir ad seçin. Örn. aile-butcesi.
          </p>
          {nameError ? <FieldError id={nameErrorId}>{nameError}</FieldError> : null}
        </div>

        <div>
          <label htmlFor={descriptionId} className={labelClasses}>
            Açıklama <span className="font-normal text-muted">(isteğe bağlı)</span>
          </label>
          <textarea
            id={descriptionId}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            maxLength={350}
            aria-describedby={descriptionHelpId}
            placeholder="Bu depoda ne saklayacaksınız?"
            className={textareaClasses()}
            disabled={pending}
          />
          <p id={descriptionHelpId} className={helpClasses}>
            Depo kartında görünür. Daha sonra değiştirilebilir.
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-field border border-line p-4">
          <input
            id="repo-private"
            type="checkbox"
            checked={isPrivate}
            onChange={(event) => setIsPrivate(event.target.checked)}
            aria-describedby={privateHelpId}
            className="mt-0.5 h-4 w-4 rounded border-strong text-ink focus:ring-2 focus:ring-focus focus:ring-offset-2"
            disabled={pending}
          />
          <div>
            <label htmlFor="repo-private" className="text-sm font-medium text-ink">
              Gizli depo
            </label>
            <p id={privateHelpId} className="mt-1 text-sm leading-6 text-muted">
              Gizli depoları yalnızca siz ve izin verdiğiniz kişiler görebilir.
            </p>
          </div>
        </div>

        {formError ? <Alert tone="danger">{formError}</Alert> : null}
      </form>
    </Modal>
  );
}
