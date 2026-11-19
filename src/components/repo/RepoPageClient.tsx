"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { buttonClasses } from "@/components/ui/Button";
import { RepoBrowser, RepoPageSkeleton } from "@/components/repo/RepoBrowser";
import { TokenScreen } from "@/components/TokenScreen";
import { useSession } from "@/components/SessionProvider";

export function RepoPageClient() {
  const searchParams = useSearchParams();
  const { token, loading, guest, authError } = useSession();
  const owner = (searchParams.get("owner") ?? "").trim();
  const repo = (searchParams.get("repo") ?? "").trim();

  if (loading) {
    return <RepoPageSkeleton />;
  }

  if (!token && !guest) {
    return <TokenScreen authError={authError} />;
  }

  if (!owner || !repo) {
    return (
      <main className="mx-auto max-w-wide px-4 py-10 sm:px-6 lg:px-8">
        <Alert tone="warning" title="Depo adresi eksik">
          <p>
            Görüntülemek için bir depo seçin. Ana sayfadaki listeden depolara
            göz atabilirsiniz.
          </p>
          <Link
            href="/"
            className={buttonClasses({
              variant: "secondary",
              size: "sm",
              className: "mt-3",
            })}
          >
            Depolara dön
          </Link>
        </Alert>
      </main>
    );
  }

  return <RepoBrowser owner={owner} repo={repo} />;
}
