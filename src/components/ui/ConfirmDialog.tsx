"use client";

import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Skeleton";

export function ConfirmDialog({
  open,
  title,
  description,
  target,
  confirmLabel,
  pendingLabel = "İşleniyor…",
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: string;
  target?: string;
  confirmLabel: string;
  pendingLabel?: string;
  pending: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      size="sm"
      dismissDisabled={pending}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={pending}
            data-autofocus
          >
            Vazgeç
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={pending}>
            {pending ? <Spinner /> : null}
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {target ? (
          <p className="break-all rounded-field border border-line bg-subtle px-3 py-2 font-mono text-sm text-ink">
            {target}
          </p>
        ) : null}
        {error ? <Alert tone="danger">{error}</Alert> : null}
      </div>
    </Modal>
  );
}
