export interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string | null;
  email: string | null;
  html_url: string;
}

export interface GitHubOwner {
  login: string;
  avatar_url: string;
  html_url?: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: GitHubOwner;
  private: boolean;
  description: string | null;
  updated_at: string;
  default_branch: string;
  html_url: string;
  permissions?: {
    admin?: boolean;
    maintain?: boolean;
    push?: boolean;
  };
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected?: boolean;
}

export type GitHubTreeEntryType = "blob" | "tree" | "commit";

export interface GitHubTreeEntry {
  path: string;
  mode: string;
  type: GitHubTreeEntryType;
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubTree {
  sha: string;
  url?: string;
  tree: GitHubTreeEntry[];
  truncated: boolean;
}

export interface GitHubDirectoryItem {
  type: "file" | "dir" | "symlink" | "submodule";
  size: number;
  name: string;
  path: string;
  sha: string;
  url: string;
  html_url: string | null;
  git_url: string | null;
  download_url: string | null;
}

export interface GitHubFileContent extends GitHubDirectoryItem {
  type: "file";
  encoding: "base64" | "none";
  content: string;
  target?: string;
}

export type GitHubContents = GitHubFileContent | GitHubDirectoryItem[];

export interface GitHubWriteResult {
  content: {
    name: string;
    path: string;
    sha: string;
    html_url: string | null;
  } | null;
  commit: {
    sha: string;
    html_url: string;
    message: string;
  };
}

export interface NewRepoInput {
  name: string;
  description: string;
  private: boolean;
}

export interface CommitIdentity {
  name: string;
  email: string;
}

interface GitHubCommitPerson {
  name: string;
  email: string;
  date: string;
}

export interface GitHubCommitSummary {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: GitHubCommitPerson | null;
    committer?: GitHubCommitPerson | null;
  };
  author: GitHubOwner | null;
}

export type GitHubFileStatus =
  | "added"
  | "modified"
  | "removed"
  | "renamed"
  | "copied"
  | "changed"
  | "unchanged";

export interface GitHubCommitFile {
  filename: string;
  previous_filename?: string;
  status: GitHubFileStatus | string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export interface GitHubCommitDetail extends GitHubCommitSummary {
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
  files?: GitHubCommitFile[];
  parents?: Array<{
    sha: string;
    html_url: string;
  }>;
}

export interface GitHubLabel {
  id: number;
  name: string;
  color: string;
  description?: string | null;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  html_url: string;
  comments: number;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
  user: GitHubOwner | null;
  labels: GitHubLabel[];
  pull_request?: unknown;
}

export interface GitHubComment {
  id: number;
  body: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  user: GitHubOwner | null;
}

export interface GitHubRef {
  ref: string;
  object: {
    sha: string;
    type: string;
    url: string;
  };
  url: string;
}
