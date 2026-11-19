"use client";

import { useId, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { ExternalLink, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Skeleton";
import { FieldError, helpClasses, inputClasses, labelClasses } from "@/components/ui/form";
import { useSession } from "@/components/SessionProvider";

const TOKEN_CREATE_URL =
  "https://github.com/settings/tokens/new?scopes=repo&description=GitKolay";

export function TokenForm({
  initialError,
  autoFocus = false,
}: {
  initialError?: string | null;
  autoFocus?: boolean;
}) {
  const { connect } = useSession();
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const inputId = useId();
  const helpId = useId();
  const errorId = useId();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!value.trim()) {
      setError("Token girin.");
      return;
    }

    setPending(true);
    setError(null);

    const result = await connect(value);

    setPending(false);

    if (!result.ok) {
      setError(result.error ?? "Bağlantı kurulamadı.");
      return;
    }

    setValue("");
    toast.success("GitHub hesabınıza bağlandınız.");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor={inputId} className={labelClasses}>
          Kişisel erişim tokenı{" "}
          <span className="font-normal text-muted">(gerekli)</span>
        </label>
        <input
          id={inputId}
          type="password"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) {
              setError(null);
            }
          }}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          autoFocus={autoFocus}
          data-autofocus={autoFocus ? true : undefined}
          aria-describedby={error ? `${helpId} ${errorId}` : helpId}
          aria-invalid={error ? true : undefined}
          placeholder="github_pat_… veya ghp_…"
          className={inputClasses()}
          disabled={pending}
        />
        <p id={helpId} className={helpClasses}>
          Token yalnızca bu tarayıcı sekmesinde saklanır; doğrudan
          GitHub&apos;a gönderilir.
        </p>
        {error ? <FieldError id={errorId}>{error}</FieldError> : null}
      </div>

      <Alert tone="info">
        <p>
          <span className="font-medium">Gerekli izin: repo.</span> Özel
          depoları görmek ve değişiklik kaydetmek için bu izin gerekir.
        </p>
        <a
          href={TOKEN_CREATE_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 font-medium text-focus underline underline-offset-4"
        >
          GitHub&apos;da token oluştur
          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
        </a>
      </Alert>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Spinner /> : <KeyRound aria-hidden="true" className="h-4 w-4" />}
        {pending ? "Bağlanıyor…" : "Bağlan"}
      </Button>
    </form>
  );
}
