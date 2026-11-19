"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { GitHubApiError, getErrorMessage } from "@/lib/github";

export function ApiErrorNotice({
  title,
  error,
  onRetry,
  token,
  onOpenToken,
  children,
}: {
  title: string;
  error: unknown;
  onRetry?: () => void;
  token: string | null;
  onOpenToken: () => void;
  children?: ReactNode;
}) {
  const status = error instanceof GitHubApiError ? error.status : null;
  const isNotFound = status === 404;

  return (
    <ErrorNotice title={title} message={getErrorMessage(error)} onRetry={onRetry}>
      {isNotFound ? (
        <p>
          İçerik silinmiş, adı değişmiş veya bu içeriğe erişim izniniz yok
          olabilir.
        </p>
      ) : null}
      {!token ? (
        <p>
          Depo özel olabilir. Özel depoları görmek için token bağlayın.
        </p>
      ) : null}
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
      {children ? <div className="mt-2">{children}</div> : null}
    </ErrorNotice>
  );
}
