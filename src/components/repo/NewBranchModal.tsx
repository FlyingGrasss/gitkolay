"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { GitBranchPlus } from "lucide-react";
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
  createBranchRef,
  getErrorMessage,
} from "@/lib/github";
import type { GitHubBranch } from "@/lib/types";

function validateBranchName(rawName: string, branches: GitHubBranch[]): string | null {
  const name = rawName.trim();

  if (!name) {
    return "Dal adı gerekli.";
  }

  if (name.length > 100) {
    return "Dal adı 100 karakterden uzun olamaz.";
  }

  if (/\s/.test(name)) {
    return "Dal adında boşluk olamaz.";
  }

  if (name.startsWith("/") || name.endsWith("/") || name.includes("//")) {
    return "Dal adı eğik çizgiyle başlayamaz, bitemez veya çift eğik çizgi içeremez.";
  }

  if (
    name.includes("..") ||
    name.includes("@{") ||
    name.endsWith(".") ||
    name.endsWith(".lock") ||
    name === "HEAD" ||
    name === "@" ||
    name.startsWith("-")
  ) {
    return "Geçerli bir dal adı yazın. Örn. yeni-ozellik.";
  }

  if (/[~^:?*\[\\]/.test(name)) {
    return "Dal adında ~ ^ : ? * [ veya \\ karakterleri kullanılamaz.";
  }

  if (branches.some((branch) => branch.name === name)) {
    return "Bu adda bir dal zaten var.";
  }

  return null;
}

export function NewBranchModal({
  open,
  token,
  owner,
  repo,
  branches,
  currentBranch,
  onClose,
  onCreated,
}: {
  open: boolean;
  token: string | null;
  owner: string;
  repo: string;
  branches: GitHubBranch[];
  currentBranch: string;
  onClose: () => void;
  onCreated: (name: string) => Promise<void> | void;
}) {
  const [name, setName] = useState("");
  const [source, setSource] = useState("");
  const [pending, setPending] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const nameId = useId();
  const sourceId = useId();
  const nameHelpId = useId();
  const nameErrorId = useId();
  const sourceHelpId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const preferredSource =
      branches.find((branch) => branch.name === currentBranch)?.name ??
      branches[0]?.name ??
      "";

    setName("");
    setSource(preferredSource);
    setPending(false);
    setNameError(null);
    setFormError(null);
  }, [open, branches, currentBranch]);

  const selectedSource = branches.find((branch) => branch.name === source);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateBranchName(name, branches);

    if (validationError) {
      setNameError(validationError);
      return;
    }

    if (!selectedSource) {
      setFormError("Kaynak dal seçin.");
      return;
    }

    if (!token) {
      setFormError("Dal oluşturmak için token gerekir.");
      return;
    }

    setNameError(null);
    setFormError(null);
    setPending(true);

    try {
      await createBranchRef(token, owner, repo, {
        name: name.trim(),
        sha: selectedSource.commit.sha,
      });
      toast.success(`${name.trim()} dalı oluşturuldu.`);

      try {
        await onCreated(name.trim());
      } catch {
        toast.error(
          "Dal oluşturuldu ancak liste yenilenemedi. Sayfayı yenileyin.",
        );
      }

      onClose();
    } catch (error) {
      if (error instanceof GitHubApiError && error.status === 422) {
        const detail = error.detail?.toLowerCase() ?? "";

        if (detail.includes("already exists") || detail.includes("reference")) {
          setNameError("Bu adda bir dal zaten var.");
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
      title="Yeni dal"
      description="Dal, aynı depoda dosyaları etkilemeden değişiklik yapmanızı sağlar. Yeni dal seçili kaynağın bir kopyasıyla başlar."
      dismissDisabled={pending}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Vazgeç
          </Button>
          <Button type="submit" form="new-branch-form" disabled={pending}>
            {pending ? (
              <Spinner />
            ) : (
              <GitBranchPlus aria-hidden="true" className="h-4 w-4" />
            )}
            {pending ? "Oluşturuluyor…" : "Dalı oluştur"}
          </Button>
        </div>
      }
    >
      <form
        id="new-branch-form"
        onSubmit={handleSubmit}
        className="space-y-5"
        noValidate
      >
        <div>
          <label htmlFor={nameId} className={labelClasses}>
            Dal adı <span className="font-normal text-muted">(gerekli)</span>
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
            spellCheck={false}
            required
            aria-describedby={
              nameError ? `${nameHelpId} ${nameErrorId}` : nameHelpId
            }
            aria-invalid={nameError ? true : undefined}
            aria-required="true"
            placeholder="yeni-ozellik"
            className={inputClasses()}
            disabled={pending}
          />
          <p id={nameHelpId} className={helpClasses}>
            Kısa ve anlaşılır bir ad seçin. Türkçe karakter kullanabilirsiniz.
          </p>
          {nameError ? (
            <FieldError id={nameErrorId}>{nameError}</FieldError>
          ) : null}
        </div>

        <div>
          <label htmlFor={sourceId} className={labelClasses}>
            Kaynaktan oluştur
          </label>
          <select
            id={sourceId}
            value={source}
            onChange={(event) => setSource(event.target.value)}
            aria-describedby={sourceHelpId}
            className={inputClasses()}
            disabled={pending || branches.length === 0}
          >
            {branches.length === 0 ? (
              <option value="">Kaynak dal yok</option>
            ) : null}
            {branches.map((branch) => (
              <option key={branch.name} value={branch.name}>
                {branch.name}
              </option>
            ))}
          </select>
          <p id={sourceHelpId} className={helpClasses}>
            {selectedSource
              ? `Yeni dal, ${selectedSource.name} dalının son hâlinden başlar (${selectedSource.commit.sha.slice(0, 7)}).`
              : "Yeni dal için bir kaynak dal gerekir."}
          </p>
        </div>

        {formError ? <Alert tone="danger">{formError}</Alert> : null}
      </form>
    </Modal>
  );
}
