"use client";

import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";
import { LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { TokenModal } from "@/components/TokenModal";
import { useSession } from "@/components/SessionProvider";

export function AppHeader() {
  const { token, user, loading, disconnect } = useSession();
  const [tokenModalOpen, setTokenModalOpen] = useState(false);

  const handleDisconnect = () => {
    disconnect();
    toast.success("Token unutuldu.");
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-page/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-wide items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-field focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-sm font-bold text-white">
              G
            </span>
            <span className="text-lg font-semibold tracking-tight text-ink">
              GitKolay
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {loading ? (
              <Skeleton className="h-9 w-28" />
            ) : user ? (
              <>
                <img
                  src={user.avatar_url}
                  alt={`${user.login} avatarı`}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full border border-line bg-surface"
                />
                <span className="max-w-[8rem] truncate text-sm font-medium text-ink">
                  @{user.login}
                </span>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  title="Yazma iznini kapat ve tokenı unut"
                  className="inline-flex h-9 items-center gap-1.5 rounded-field px-2 text-sm font-medium text-muted transition-colors hover:bg-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <LogOut aria-hidden="true" className="h-4 w-4" />
                  <span className="hidden sm:inline">Unut</span>
                  <span className="sr-only sm:hidden">Tokenı unut</span>
                </button>
              </>
            ) : token ? (
              <>
                <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                  <UserRound aria-hidden="true" className="h-4 w-4" />
                  <span className="hidden sm:inline">Doğrulanamadı</span>
                </span>
                <Button variant="secondary" size="sm" onClick={handleDisconnect}>
                  Unut
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setTokenModalOpen(true)}
              >
                Token bağla
              </Button>
            )}
          </div>
        </div>
      </header>

      <TokenModal
        open={tokenModalOpen}
        onClose={() => setTokenModalOpen(false)}
      />
    </>
  );
}
