import { Suspense } from "react";
import { RepoPageClient } from "@/components/repo/RepoPageClient";
import { RepoPageSkeleton } from "@/components/repo/RepoBrowser";

export default function RepoPage() {
  return (
    <Suspense fallback={<RepoPageSkeleton />}>
      <RepoPageClient />
    </Suspense>
  );
}
