import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export function ErrorNotice({
  title = "Bir sorun oluştu",
  message,
  onRetry,
  children,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  children?: ReactNode;
}) {
  return (
    <Alert tone="danger" title={title}>
      <p>{message}</p>
      {children ? <div className="mt-2">{children}</div> : null}
      {onRetry ? (
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={onRetry}
        >
          Tekrar dene
        </Button>
      ) : null}
    </Alert>
  );
}
