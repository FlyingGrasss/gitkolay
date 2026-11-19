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
