import { decodeBase64Utf8 } from "@/lib/base64";
import type {
  GitHubFileContent,
  GitHubTree,
  GitHubTreeEntry,
} from "@/lib/types";

const BINARY_EXTENSIONS = new Set([
  "ai",
  "avi",
  "bmp",
  "class",
  "doc",
  "docx",
  "dll",
  "eot",
  "exe",
  "gif",
  "gz",
  "ico",
  "jar",
  "jpeg",
  "jpg",
  "mov",
  "mp3",
  "mp4",
  "otf",
  "pdf",
  "png",
  "ppt",
  "pptx",
  "psd",
  "rar",
  "so",
  "tar",
  "tif",
  "tiff",
  "ttf",
  "wav",
  "webm",
  "webp",
  "woff",
  "woff2",
  "xls",
  "xlsx",
  "zip",
  "7z",
]);

const IMAGE_EXTENSIONS = new Set([
  "bmp",
  "gif",
  "ico",
  "jpeg",
  "jpg",
  "png",
  "svg",
  "webp",
]);

export type FilePreview =
  | { kind: "text"; text: string }
  | { kind: "binary"; reason: string };

export function fileExtension(path: string): string {
  const name = path.split("/").pop() ?? "";
  const dotIndex = name.lastIndexOf(".");
  return dotIndex <= 0 ? "" : name.slice(dotIndex + 1).toLowerCase();
}

export function isImagePath(path: string): boolean {
  return IMAGE_EXTENSIONS.has(fileExtension(path));
}

export function previewForFile(file: GitHubFileContent, path: string): FilePreview {
  if (file.encoding !== "base64") {
    return {
      kind: "binary",
      reason:
        file.size > 1_000_000
          ? "Bu dosya 1 MB'tan büyük olduğu için burada düzenlenemez."
          : "Bu dosyanın içeriği metin olarak görüntülenemiyor.",
    };
  }

  if (BINARY_EXTENSIONS.has(fileExtension(path))) {
    return {
      kind: "binary",
      reason: "Bu dosya metin olarak düzenlenemez.",
    };
  }

  try {
    const text = decodeBase64Utf8(file.content);

    if (text.includes("\u0000")) {
      return {
        kind: "binary",
        reason: "Bu dosya metin olarak düzenlenemez.",
      };
    }

    return { kind: "text", text };
  } catch {
    return {
      kind: "binary",
      reason: "Bu dosya metin olarak düzenlenemez.",
    };
  }
}

export interface DirectoryEntry {
  name: string;
  path: string;
  type: "file" | "directory" | "submodule";
  size?: number;
  sha: string;
}

export function listDirectory(
  tree: GitHubTree,
  directory: string,
): DirectoryEntry[] {
  const normalizedDirectory = directory.replace(/^\/+|\/+$/g, "");
  const prefix = normalizedDirectory ? `${normalizedDirectory}/` : "";
  const directories = new Map<string, DirectoryEntry>();
  const files: DirectoryEntry[] = [];

  for (const entry of tree.tree) {
    if (!entry.path.startsWith(prefix)) {
      continue;
    }

    const rest = entry.path.slice(prefix.length);

    if (!rest) {
      continue;
    }

    const slashIndex = rest.indexOf("/");

    if (slashIndex !== -1) {
      const name = rest.slice(0, slashIndex);
      const path = `${prefix}${name}`;

      if (!directories.has(name)) {
        directories.set(name, {
          name,
          path,
          type: "directory",
          sha: "",
        });
      }

      continue;
    }

    if (entry.type === "tree") {
      directories.set(rest, {
        name: rest,
        path: entry.path,
        type: "directory",
        sha: entry.sha,
      });
    } else {
      files.push({
        name: rest,
        path: entry.path,
        type: entry.type === "commit" ? "submodule" : "file",
        size: entry.size,
        sha: entry.sha,
      });
    }
  }

  const sortedDirectories = [...directories.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "tr"),
  );
  const sortedFiles = files.sort((a, b) => a.name.localeCompare(b.name, "tr"));

  return [...sortedDirectories, ...sortedFiles];
}

export function findTreeEntry(
  tree: GitHubTree,
  path: string,
): GitHubTreeEntry | undefined {
  return tree.tree.find((entry) => entry.path === path);
}

export function parentPath(path: string): string {
  const segments = path.split("/").filter(Boolean);
  segments.pop();
  return segments.join("/");
}

export function normalizeFilePath(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/");
}

export function isValidFilePath(value: string): boolean {
  const normalized = normalizeFilePath(value);

  if (!normalized) {
    return false;
  }

  return !normalized
    .split("/")
    .some(
      (segment) =>
        segment === "" ||
        segment === "." ||
        segment === ".." ||
        segment.toLowerCase() === ".git",
    );
}

export function formatBytes(size?: number): string {
  if (typeof size !== "number" || Number.isNaN(size)) {
    return "";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toLocaleString("tr-TR", {
      maximumFractionDigits: 1,
    })} KB`;
  }

  return `${(size / (1024 * 1024)).toLocaleString("tr-TR", {
    maximumFractionDigits: 1,
  })} MB`;
}
