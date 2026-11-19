"use client";

import toast from "react-hot-toast";
import { LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TokenForm } from "@/components/TokenForm";
import { useSession } from "@/components/SessionProvider";

export function TokenModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user, disconnect } = useSession();

  const handleDisconnect = () => {
    disconnect();
    onClose();
    toast.success("Token unutuldu.");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={user ? "Bağlı hesap" : "GitHub'a bağlan"}
      description={
        user
          ? "Bu token yalnızca bu tarayıcı sekmesinde saklanıyor."
          : "Devam etmek için GitHub kişisel erişim tokenınızı girin."
      }
    >
      {user ? (
        <div className="space-y-5">
          <div className="flex items-center gap-4 rounded-container border border-line bg-subtle p-4">
            <img
              src={user.avatar_url}
              alt={`${user.login} avatarı`}
              width={48}
              height={48}
              className="h-12 w-12 rounded-full border border-line bg-surface"
            />
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">
                {user.name || user.login}
              </p>
              <p className="truncate text-sm text-muted">@{user.login}</p>
            </div>
            <ShieldCheck
              aria-label="Bağlantı doğrulandı"
              className="ml-auto h-5 w-5 shrink-0 text-success"
            />
          </div>
          <p className="text-sm leading-6 text-muted">
            Token; depo listeleme, dosya düzenleme ve yeni depo oluşturma
            işlemleri için kullanılıyor. Sekmeyi kapattığınızda oturum sona
            erer.
          </p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onClose}>
              Kapat
            </Button>
            <Button variant="danger" onClick={handleDisconnect}>
              <LogOut aria-hidden="true" className="h-4 w-4" />
              Unut
            </Button>
          </div>
        </div>
      ) : (
        <TokenForm autoFocus />
      )}
    </Modal>
  );
}
