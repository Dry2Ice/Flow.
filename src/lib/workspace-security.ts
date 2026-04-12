import path from 'path';

export class WorkspaceSecurityError extends Error {
  readonly status: number;
  readonly reason: string;

  constructor(status: number, reason: string, message: string) {
    super(message);
    this.status = status;
    this.reason = reason;
    this.name = 'WorkspaceSecurityError';
  }
}

const USER_PATH_MAX_LENGTH = 1024;

export function getWorkspaceRoot(): string {
  const configuredRoot = process.env.WORKSPACE_ROOT;

  if (!configuredRoot || !configuredRoot.trim()) {
    throw new WorkspaceSecurityError(500, 'missing_workspace_root', 'Server workspace root is not configured');
  }

  return path.resolve(configuredRoot);
}

export function resolveWorkspacePath(userInput: unknown, workspaceRoot: string): string {
  if (typeof userInput !== 'string' || !userInput.trim()) {
    throw new WorkspaceSecurityError(400, 'invalid_path', 'Project path is required');
  }

  if (userInput.length > USER_PATH_MAX_LENGTH) {
    throw new WorkspaceSecurityError(400, 'path_too_long', 'Project path is invalid');
  }

  if (path.isAbsolute(userInput)) {
    throw new WorkspaceSecurityError(403, 'absolute_path_forbidden', 'Access denied');
  }

  const normalizedInput = userInput.replace(/\\/g, '/');
  const pathSegments = normalizedInput.split('/').filter(Boolean);

  if (pathSegments.some(segment => segment === '..')) {
    throw new WorkspaceSecurityError(403, 'parent_path_forbidden', 'Access denied');
  }

  const resolvedPath = path.resolve(workspaceRoot, normalizedInput);
  const rootPrefix = workspaceRoot.endsWith(path.sep) ? workspaceRoot : `${workspaceRoot}${path.sep}`;

  if (resolvedPath !== workspaceRoot && !resolvedPath.startsWith(rootPrefix)) {
    throw new WorkspaceSecurityError(403, 'outside_workspace', 'Access denied');
  }

  return resolvedPath;
}

export function logSecurityWarning(context: string, reason: string, rawInput: unknown): void {
  const inputSnippet = typeof rawInput === 'string' ? rawInput.slice(0, 120) : String(rawInput);
  console.warn(`[SECURITY_WARNING] ${context}: ${reason}`, {
    input: inputSnippet,
  });
}
