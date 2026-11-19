import type {
  CommitIdentity,
  GitHubBranch,
  GitHubContents,
  GitHubRepo,
  GitHubTree,
  GitHubUser,
  GitHubWriteResult,
  NewRepoInput,
} from "@/lib/types";

const API_BASE = "https://api.github.com";
const API_VERSION = "2022-11-28";

interface RequestOptions {
  token?: string | null;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
}

export class GitHubApiError extends Error {
  readonly status: number;
  readonly detail?: string;
  readonly rateLimitReset?: number;

  constructor(
    status: number,
    message: string,
    detail?: string,
    rateLimitReset?: number,
  ) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
    this.detail = detail;
    this.rateLimitReset = rateLimitReset;
  }
}

export class NetworkError extends Error {
  constructor() {
    super(
      "GitHub'a ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.",
    );
    this.name = "NetworkError";
  }
}

export function formatRateLimitReset(epochSeconds?: number): string | null {
  if (!epochSeconds) {
    return null;
  }

  const resetDate = new Date(epochSeconds * 1000);

  if (Number.isNaN(resetDate.getTime())) {
    return null;
  }

  const now = new Date();
  const sameDay =
    resetDate.getFullYear() === now.getFullYear() &&
    resetDate.getMonth() === now.getMonth() &&
    resetDate.getDate() === now.getDate();

  if (sameDay) {
    const time = new Intl.DateTimeFormat("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(resetDate);

    return `İstek sınırı yerel saatle ${time} itibarıyla sıfırlanacak.`;
  }

  const dateTime = new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(resetDate);

  return `İstek sınırı ${dateTime} itibarıyla sıfırlanacak.`;
}

function parseJsonResponse(text: string): unknown {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function getApiMessage(data: unknown): string | undefined {
  if (
    typeof data === "object" &&
    data !== null &&
    "message" in data &&
    typeof data.message === "string"
  ) {
    return data.message;
  }

  return undefined;
}

async function githubRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers({
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": API_VERSION,
  });

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? "GET",
      headers,
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new NetworkError();
  }

  const rawText = response.status === 204 ? "" : await response.text();
  const data = parseJsonResponse(rawText);

  if (!response.ok) {
    const apiMessage = getApiMessage(data);
    const rateLimitRemaining = response.headers.get("x-ratelimit-remaining");
    const rateLimitResetHeader = response.headers.get("x-ratelimit-reset");
    const rateLimitReset = rateLimitResetHeader
      ? Number.parseInt(rateLimitResetHeader, 10)
      : undefined;

    let message = "GitHub isteği tamamlanamadı.";

    if (response.status === 401) {
      message = "Token geçersiz veya süresi dolmuş.";
    } else if (response.status === 404) {
      message = "Bulunamadı.";
    } else if (response.status === 409) {
      message = "Dosya siz düzenlerken değişmiş; yeniden yükleyin.";
    } else if (response.status === 422) {
      message = "Gönderilen bilgiler geçerli değil.";
    } else if (response.status === 403 || response.status === 429) {
      if (rateLimitRemaining === "0" || response.status === 429) {
        const resetText = formatRateLimitReset(rateLimitReset);
        message = resetText
          ? `GitHub istek sınırı doldu. ${resetText}`
          : "GitHub istek sınırı doldu. Lütfen biraz sonra tekrar deneyin.";
      } else {
        message =
          "Bu işlem için izniniz yok. Tokenınızın repo iznini içerdiğinden emin olun.";
      }
    } else if (response.status >= 500) {
      message = "GitHub şu anda yanıt vermiyor. Biraz sonra tekrar deneyin.";
    }

    throw new GitHubApiError(
      response.status,
      message,
      apiMessage,
      Number.isNaN(rateLimitReset) ? undefined : rateLimitReset,
    );
  }

  return data as T;
}

function repoBase(owner: string, repo: string): string {
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

function encodePath(path: string): string {
  return path
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function commitIdentityFor(user: GitHubUser): CommitIdentity {
  return {
    name: user.name?.trim() || user.login,
    email:
      user.email?.trim() || `${user.login}@users.noreply.github.com`,
  };
}

export function getAuthenticatedUser(token: string): Promise<GitHubUser> {
  return githubRequest<GitHubUser>("/user", { token });
}

export function listMyRepos(token: string): Promise<GitHubRepo[]> {
  return githubRequest<GitHubRepo[]>(
    "/user/repos?per_page=100&sort=updated",
    { token },
  );
}

export function listOwnerRepos(owner: string): Promise<GitHubRepo[]> {
  return githubRequest<GitHubRepo[]>(
    `/users/${encodeURIComponent(owner)}/repos?per_page=100&sort=updated`,
  );
}

export function createRepository(
  token: string,
  input: NewRepoInput,
): Promise<GitHubRepo> {
  return githubRequest<GitHubRepo>("/user/repos", {
    token,
    method: "POST",
    body: {
      name: input.name,
      description: input.description || null,
      private: input.private,
      auto_init: true,
    },
  });
}

export function getRepository(
  owner: string,
  repo: string,
  token?: string | null,
): Promise<GitHubRepo> {
  return githubRequest<GitHubRepo>(repoBase(owner, repo), { token });
}

export function listBranches(
  owner: string,
  repo: string,
  token?: string | null,
): Promise<GitHubBranch[]> {
  return githubRequest<GitHubBranch[]>(
    `${repoBase(owner, repo)}/branches?per_page=100`,
    { token },
  );
}

export function getBranch(
  owner: string,
  repo: string,
  branch: string,
  token?: string | null,
): Promise<GitHubBranch> {
  return githubRequest<GitHubBranch>(
    `${repoBase(owner, repo)}/branches/${encodeURIComponent(branch)}`,
    { token },
  );
}

export function getTree(
  owner: string,
  repo: string,
  sha: string,
  token?: string | null,
): Promise<GitHubTree> {
  return githubRequest<GitHubTree>(
    `${repoBase(owner, repo)}/git/trees/${encodeURIComponent(sha)}?recursive=1`,
    { token },
  );
}

export function getContents(
  owner: string,
  repo: string,
  path: string,
  ref: string,
  token?: string | null,
): Promise<GitHubContents> {
  return githubRequest<GitHubContents>(
    `${repoBase(owner, repo)}/contents/${encodePath(path)}?ref=${encodeURIComponent(ref)}`,
    { token },
  );
}

export function putContents(
  token: string,
  owner: string,
  repo: string,
  path: string,
  input: {
    message: string;
    content: string;
    branch: string;
    sha?: string;
    committer: CommitIdentity;
  },
): Promise<GitHubWriteResult> {
  return githubRequest<GitHubWriteResult>(
    `${repoBase(owner, repo)}/contents/${encodePath(path)}`,
    {
      token,
      method: "PUT",
      body: {
        message: input.message,
        content: input.content,
        branch: input.branch,
        sha: input.sha,
        committer: input.committer,
      },
    },
  );
}

export function deleteContents(
  token: string,
  owner: string,
  repo: string,
  path: string,
  input: {
    message: string;
    sha: string;
    branch: string;
    committer: CommitIdentity;
  },
): Promise<GitHubWriteResult> {
  return githubRequest<GitHubWriteResult>(
    `${repoBase(owner, repo)}/contents/${encodePath(path)}`,
    {
      token,
      method: "DELETE",
      body: {
        message: input.message,
        sha: input.sha,
        branch: input.branch,
        committer: input.committer,
      },
    },
  );
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof GitHubApiError || error instanceof NetworkError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.";
}
