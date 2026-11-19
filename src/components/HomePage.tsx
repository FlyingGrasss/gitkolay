"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { FolderPlus, Plus, Search, Users } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Skeleton } from "@/components/ui/Skeleton";
import { FieldError, helpClasses, inputClasses, labelClasses } from "@/components/ui/form";
import { RepoCard } from "@/components/RepoCard";
import { NewRepoModal } from "@/components/NewRepoModal";
import { TokenModal } from "@/components/TokenModal";
import { TokenScreen } from "@/components/TokenScreen";
import { useSession } from "@/components/SessionProvider";
import {
  getErrorMessage,
  listMyRepos,
  listOwnerRepos,
} from "@/lib/github";
import type { GitHubRepo } from "@/lib/types";

type ListStatus = "idle" | "loading" | "ready" | "error";
type BrowseMode = "mine" | "public";

const USERNAME_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

function HomePageSkeleton() {
  return (
    <main
      className="mx-auto max-w-wide px-4 py-10 sm:px-6 lg:px-8"
      aria-busy="true"
    >
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>
      <Skeleton className="mt-8 h-32 w-full rounded-container" />
      <Skeleton className="mt-10 h-7 w-44" />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-48 rounded-container" />
        ))}
      </div>
      <span className="sr-only">Depolar yükleniyor…</span>
    </main>
  );
}

export function HomePage() {
  const { token, loading, guest, authError } = useSession();
  const [mode, setMode] = useState<BrowseMode>("mine");
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [status, setStatus] = useState<ListStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [ownerInput, setOwnerInput] = useState("");
  const [ownerError, setOwnerError] = useState<string | null>(null);
  const [activeOwner, setActiveOwner] = useState<string | null>(null);
  const [newRepoOpen, setNewRepoOpen] = useState(false);
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const requestSequence = useRef(0);
  const searchId = useId();
  const ownerId = useId();
  const ownerHelpId = useId();
  const ownerErrorId = useId();

  const loadRepos = useCallback(
    async (
      target:
        | { kind: "mine"; token: string }
        | { kind: "public"; owner: string },
    ) => {
      const requestId = requestSequence.current + 1;
      requestSequence.current = requestId;
      setStatus("loading");
      setError(null);

      try {
        const data =
          target.kind === "mine"
            ? await listMyRepos(target.token)
            : await listOwnerRepos(target.owner);

        if (requestSequence.current !== requestId) {
          return;
        }

        setRepos(data);
        setStatus("ready");
      } catch (caught) {
        if (requestSequence.current !== requestId) {
          return;
        }

        setError(getErrorMessage(caught));
        setStatus("error");
      }
    },
    [],
  );

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!token) {
      requestSequence.current += 1;
      setRepos([]);
      setStatus("idle");
      setError(null);
      setMode("mine");
      setActiveOwner(null);
      return;
    }

    setMode("mine");
    setActiveOwner(null);
    void loadRepos({ kind: "mine", token });
  }, [token, loading, loadRepos]);

  const openOwner = useCallback(
    (rawOwner: string) => {
      const owner = rawOwner.trim().replace(/^@+/, "");

      if (!owner) {
        setOwnerError("Bir kullanıcı adı yazın.");
        return;
      }

      if (!USERNAME_PATTERN.test(owner)) {
        setOwnerError("Geçerli bir GitHub kullanıcı adı yazın.");
        return;
      }

      setOwnerError(null);
      setOwnerInput(owner);
      setActiveOwner(owner);
      setMode("public");
      setQuery("");
      void loadRepos({ kind: "public", owner });
    },
    [loadRepos],
  );

  const handleOwnerSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    openOwner(ownerInput);
  };

  const showMine = () => {
    setMode("mine");
    setActiveOwner(null);
    setQuery("");
    setOwnerError(null);

    if (token) {
      void loadRepos({ kind: "mine", token });
    } else {
      setRepos([]);
      setStatus("idle");
    }
  };

  const retry = () => {
    if (mode === "public" && activeOwner) {
      void loadRepos({ kind: "public", owner: activeOwner });
    } else if (token) {
      void loadRepos({ kind: "mine", token });
    }
  };

  const handleCreated = (repo: GitHubRepo) => {
    setNewRepoOpen(false);
    setMode("mine");
    setActiveOwner(null);
    setQuery("");

    if (token) {
      void loadRepos({ kind: "mine", token });
    } else {
      setRepos((current) => [repo, ...current]);
      setStatus("ready");
    }
  };

  const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");
  const filteredRepos = useMemo(() => {
    if (!normalizedQuery) {
      return repos;
    }

    return repos.filter((repo) => {
      const name = repo.name.toLocaleLowerCase("tr-TR");
      const description = (repo.description ?? "").toLocaleLowerCase("tr-TR");
      return (
        name.includes(normalizedQuery) || description.includes(normalizedQuery)
      );
    });
  }, [repos, normalizedQuery]);

  if (loading) {
    return <HomePageSkeleton />;
  }

  if (!token && !guest) {
    return <TokenScreen authError={authError} />;
  }

  const listTitle =
    mode === "public" && activeOwner
      ? `${activeOwner} depoları`
      : token
        ? "Depolarınız"
        : "Herkese açık depolar";
  const showSearch = status === "ready" && repos.length > 0;

  return (
    <>
      <main className="mx-auto max-w-wide px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              {token
                ? mode === "public" && activeOwner
                  ? `${activeOwner} depoları`
                  : "Depolarım"
                : "GitHub depolarını keşfedin"}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
              {mode === "public" && activeOwner
                ? token
                  ? "Herkese açık depolar görüntüleniyor. Değişiklik yapmak için bu depoda yazma izniniz olmalı."
                  : "Herkese açık depolar görüntüleniyor. Düzenleme ve yeni depo için token gerekir."
                : token
                  ? "Son güncellenen 100 depo. Bir depoya tıklayarak dosyalarını görün."
                  : "Herkese açık depoları görüntülemek için bir kullanıcı adı yazın. Düzenleme ve yeni depo için token gerekir."}
            </p>
          </div>

          <span
            className="inline-block shrink-0"
            title={!token ? "Yazmak için token gerekir" : undefined}
          >
            <Button
              size="lg"
              onClick={() => setNewRepoOpen(true)}
              disabled={!token}
              aria-describedby={!token ? "write-hint" : undefined}
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Yeni depo
            </Button>
          </span>
        </div>

        {!token ? (
          <Alert tone="info" title="Salt okunur görünüm" className="mt-6">
            <p id="write-hint">
              Yazmak için token gerekir. Bu modda yalnızca herkese açık
              depoları görüntüleyebilirsiniz.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => setTokenModalOpen(true)}
            >
              Token bağla
            </Button>
          </Alert>
        ) : null}

        <section
          aria-labelledby="public-owner-heading"
          className="mt-8 rounded-container border border-line p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2
                id="public-owner-heading"
                className="text-lg font-semibold text-ink"
              >
                Başka bir kullanıcıya bak
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                Herkese açık depoları görüntülemek için bir GitHub kullanıcı
                adı yazın.
              </p>
            </div>
            {mode === "public" && token ? (
              <Button variant="ghost" size="sm" onClick={showMine}>
                Depolarıma dön
              </Button>
            ) : null}
          </div>

          <form
            onSubmit={handleOwnerSubmit}
            className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start"
            noValidate
          >
            <div className="min-w-0 flex-1">
              <label htmlFor={ownerId} className={labelClasses}>
                GitHub kullanıcı adı
              </label>
              <input
                id={ownerId}
                value={ownerInput}
                onChange={(event) => {
                  setOwnerInput(event.target.value);
                  if (ownerError) {
                    setOwnerError(null);
                  }
                }}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                required
                placeholder="ör. octocat"
                aria-describedby={
                  ownerError ? `${ownerHelpId} ${ownerErrorId}` : ownerHelpId
                }
                aria-invalid={ownerError ? true : undefined}
                className={inputClasses()}
              />
              <p id={ownerHelpId} className={helpClasses}>
                Baştaki @ işareti gerekmez.
              </p>
              {ownerError ? (
                <FieldError id={ownerErrorId}>{ownerError}</FieldError>
              ) : null}
            </div>
            <Button
              type="submit"
              variant="secondary"
              className="sm:mt-[1.625rem]"
            >
              Depoları getir
            </Button>
          </form>
        </section>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink">{listTitle}</h2>
            <p className="mt-1 text-sm text-muted" aria-live="polite">
              {status === "loading"
                ? "Yükleniyor…"
                : status === "ready"
                  ? `${filteredRepos.length} depo`
                  : status === "error"
                    ? "Yüklenemedi"
                    : "Henüz depo seçilmedi"}
            </p>
          </div>

          {showSearch ? (
            <div className="w-full sm:max-w-xs">
              <label htmlFor={searchId} className={labelClasses}>
                Depolarda ara
              </label>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                />
                <input
                  id={searchId}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Depo adı veya açıklama"
                  className={inputClasses("pl-9")}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-5" aria-busy={status === "loading" ? true : undefined}>
          {status === "loading" ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-48 rounded-container" />
              ))}
              <span className="sr-only">Depolar yükleniyor…</span>
            </div>
          ) : null}

          {status === "error" && error ? (
            <ErrorNotice
              title="Depolar getirilemedi"
              message={error}
              onRetry={retry}
            >
              {mode === "public" ? (
                <p>
                  Kullanıcı adını kontrol edin. Özel depolar için token
                  gerekir.
                </p>
              ) : null}
            </ErrorNotice>
          ) : null}

          {status === "idle" && !token ? (
            <EmptyState
              icon={<Users aria-hidden="true" className="h-8 w-8" />}
              title="Herkese açık depolara göz atın"
              description="Yukarıdaki kutuya bir GitHub kullanıcı adı yazın. Örneğin octocat yazarak başlayabilirsiniz."
              action={
                <Button
                  variant="secondary"
                  onClick={() => openOwner("octocat")}
                >
                  octocat örneğine bak
                </Button>
              }
            />
          ) : null}

          {status === "ready" && filteredRepos.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredRepos.map((repo) => (
                <RepoCard key={repo.id} repo={repo} />
              ))}
            </div>
          ) : null}

          {status === "ready" &&
          filteredRepos.length === 0 &&
          repos.length > 0 ? (
            <EmptyState
              icon={<Search aria-hidden="true" className="h-8 w-8" />}
              title="Eşleşen depo yok"
              description="Arama sözcüğünü değiştirin veya tüm depolara dönün."
              action={
                <Button variant="secondary" onClick={() => setQuery("")}>
                  Aramayı temizle
                </Button>
              }
            />
          ) : null}

          {status === "ready" && repos.length === 0 ? (
            mode === "public" && activeOwner ? (
              <EmptyState
                icon={<Users aria-hidden="true" className="h-8 w-8" />}
                title="Herkese açık depo bulunamadı"
                description={`${activeOwner} kullanıcısının görüntülenebilen deposu yok.`}
              />
            ) : (
              <EmptyState
                icon={<FolderPlus aria-hidden="true" className="h-8 w-8" />}
                title="Henüz depo yok"
                description="İlk deponuzu oluşturun; dosyalarınızı tarayıcıdan eklemeye başlayın."
                action={
                  token ? (
                    <Button onClick={() => setNewRepoOpen(true)}>
                      <Plus aria-hidden="true" className="h-4 w-4" />
                      Yeni depo
                    </Button>
                  ) : null
                }
              />
            )
          ) : null}
        </div>
      </main>

      <NewRepoModal
        open={newRepoOpen}
        token={token}
        onClose={() => setNewRepoOpen(false)}
        onCreated={handleCreated}
      />
      <TokenModal
        open={tokenModalOpen}
        onClose={() => setTokenModalOpen(false)}
      />
    </>
  );
}
