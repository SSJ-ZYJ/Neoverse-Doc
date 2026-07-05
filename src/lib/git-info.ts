// Build-time Git metadata helpers for homepage footer display.
// 用于首页 footer 展示的构建期 Git 元信息工具。

import { execFileSync } from 'node:child_process';

const GIT_COMMAND_TIMEOUT_MS = 1000;
const COMMIT_SHA_SHORT_LENGTH = 7;

export interface GitInfo {
  commitId: string | null;
  commitDateIso: string | null;
}

function readGitOutput(args: string[]): string | null {
  try {
    return execFileSync('git', args, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: GIT_COMMAND_TIMEOUT_MS,
    }).trim();
  } catch {
    return null;
  }
}

function readCommitId(): string | null {
  // Prefer CI-provided SHAs when present, then fall back to the local repo.
  // 优先读取 CI 提供的 SHA，不存在时回退到本地仓库。
  const fullSha =
    process.env.NEXT_PUBLIC_GIT_COMMIT_SHA ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.GITHUB_SHA;

  if (fullSha) {
    return fullSha.slice(0, COMMIT_SHA_SHORT_LENGTH);
  }

  return readGitOutput(['rev-parse', '--short', 'HEAD']);
}

function readCommitDateIso(): string | null {
  // CI may inject a commit date; otherwise use the latest local Git commit date.
  // CI 可注入提交日期；否则读取本地 Git 最后一次提交日期。
  return process.env.NEXT_PUBLIC_GIT_COMMIT_DATE ?? readGitOutput(['log', '-1', '--format=%cI']);
}

export function getGitInfo(): GitInfo {
  return {
    commitId: readCommitId(),
    commitDateIso: readCommitDateIso(),
  };
}
