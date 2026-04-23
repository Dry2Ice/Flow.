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
const TRUSTED_ROOTS_MAX = 16;
const TRUSTED_ROOTS_ENV_SEPARATOR = /[,:;\n]/;
const RUNTIME_TRUSTED_ROOTS_KEY = '__flow_runtime_trusted_roots__';

type GlobalWithTrustedRoots = typeof globalThis & {
  [RUNTIME_TRUSTED_ROOTS_KEY]?: Set<string>;
};

const globalWithTrustedRoots = globalThis as GlobalWithTrustedRoots;

export const runtimeTrustedRoots =
  globalWithTrustedRoots[RUNTIME_TRUSTED_ROOTS_KEY] ?? new Set<string>();

if (!globalWithTrustedRoots[RUNTIME_TRUSTED_ROOTS_KEY]) {
  globalWithTrustedRoots[RUNTIME_TRUSTED_ROOTS_KEY] = runtimeTrustedRoots;
}

function ensurePathWithinRoot(targetPath: string, rootPath: string, reason: string): void {
  const normalizedRoot = path.resolve(rootPath);
  const normalizedTarget = path.resolve(targetPath);
  const rootPrefix = normalizedRoot.endsWith(path.sep) ? normalizedRoot : `${normalizedRoot}${path.sep}`;

  if (normalizedTarget !== normalizedRoot && !normalizedTarget.startsWith(rootPrefix)) {
    throw new WorkspaceSecurityError(403, reason, 'Access denied');
  }
}

function normalizeTrustedRoots(trustedRoots: string[]): string[] {
  return [...new Set(trustedRoots.map(root => path.resolve(root.trim())).filter(Boolean))];
}

export function getWorkspaceRoot(): string {
  const configuredRoot = process.env.WORKSPACE_ROOT;

  if (configuredRoot && configuredRoot.trim()) {
    return path.resolve(configuredRoot);
  }

  // Fallback to current working directory for development convenience
  // This ensures the app works out-of-the-box without explicit configuration
  return process.cwd();
}

export function getConfiguredTrustedRoots(workspaceRoot: string): string[] {
  const envRootsRaw = process.env.WORKSPACE_TRUSTED_ROOTS || '';
  const envRoots = envRootsRaw
    .split(TRUSTED_ROOTS_ENV_SEPARATOR)
    .map(root => root.trim())
    .filter(Boolean);

  return normalizeTrustedRoots([workspaceRoot, ...envRoots, ...runtimeTrustedRoots]);
}

export function addRuntimeTrustedRoot(inputPath: string): string[] {
  if (typeof inputPath !== 'string' || !inputPath.trim()) {
    throw new WorkspaceSecurityError(400, 'invalid_trusted_root', 'Trusted root is invalid');
  }

  if (inputPath.length > USER_PATH_MAX_LENGTH) {
    throw new WorkspaceSecurityError(400, 'trusted_root_too_long', 'Trusted root is invalid');
  }

  if (!path.isAbsolute(inputPath)) {
    throw new WorkspaceSecurityError(400, 'trusted_root_must_be_absolute', 'Trusted root must be an absolute path');
  }

  runtimeTrustedRoots.add(path.resolve(inputPath));
  return [...runtimeTrustedRoots];
}

export function registerTrustedProjectRoot(
  trustedRoots: string[],
  requestedPath: unknown,
  registration: { trustedRoot?: unknown; confirm?: unknown }
): string[] {
  const roots = normalizeTrustedRoots(trustedRoots).slice(0, TRUSTED_ROOTS_MAX);
  const { trustedRoot, confirm } = registration;

  if (typeof trustedRoot === 'string' && trustedRoot.trim()) {
    if (trustedRoot.length > USER_PATH_MAX_LENGTH) {
      throw new WorkspaceSecurityError(400, 'trusted_root_too_long', 'Trusted root is invalid');
    }

    if (!path.isAbsolute(trustedRoot)) {
      throw new WorkspaceSecurityError(400, 'trusted_root_must_be_absolute', 'Trusted root must be an absolute path');
    }

    if (confirm !== true) {
      throw new WorkspaceSecurityError(
        403,
        'trusted_root_confirmation_required',
        'Explicit confirmation is required to register a trusted root'
      );
    }

    const normalizedTrustedRoot = path.resolve(trustedRoot);
    if (roots.length < TRUSTED_ROOTS_MAX) {
      roots.push(normalizedTrustedRoot);
    }

    return normalizeTrustedRoots(roots).slice(0, TRUSTED_ROOTS_MAX);
  }

  if (typeof requestedPath === 'string' && path.isAbsolute(requestedPath) && confirm !== true) {
    throw new WorkspaceSecurityError(
      403,
      'untrusted_absolute_path',
      'Absolute path is not allowed until a trusted root is explicitly confirmed'
    );
  }

  return roots;
}

export function resolveWorkspacePath(
  userInput: unknown,
  workspaceRoot: string,
  options: { trustedRoots?: string[] } = {}
): string {
  if (typeof userInput !== 'string' || !userInput.trim()) {
    throw new WorkspaceSecurityError(400, 'invalid_path', 'Project path is required');
  }

  if (userInput.length > USER_PATH_MAX_LENGTH) {
    throw new WorkspaceSecurityError(400, 'path_too_long', 'Project path is invalid');
  }

  const normalizedInput = userInput.replace(/\\/g, '/').trim();

  if (!path.isAbsolute(normalizedInput)) {
    const pathSegments = normalizedInput.split('/').filter(Boolean);

    if (pathSegments.some(segment => segment === '..')) {
      throw new WorkspaceSecurityError(403, 'parent_path_forbidden', 'Access denied');
    }

    const resolvedRelativePath = path.resolve(workspaceRoot, normalizedInput);
    ensurePathWithinRoot(resolvedRelativePath, workspaceRoot, 'outside_workspace');
    return resolvedRelativePath;
  }

  const trustedRoots = normalizeTrustedRoots(options.trustedRoots ?? [workspaceRoot]);
  const resolvedAbsolutePath = path.resolve(normalizedInput);

  const isAllowed = trustedRoots.some(root => {
    try {
      ensurePathWithinRoot(resolvedAbsolutePath, root, 'outside_trusted_roots');
      return true;
    } catch {
      return false;
    }
  });

  if (!isAllowed) {
    throw new WorkspaceSecurityError(403, 'outside_trusted_roots', 'Access denied');
  }

  return resolvedAbsolutePath;
}

export function logSecurityWarning(context: string, reason: string, rawInput: unknown): void {
  const inputSnippet = typeof rawInput === 'string' ? rawInput.slice(0, 120) : String(rawInput);
  console.warn(`[SECURITY_WARNING] ${context}: ${reason}`, {
    input: inputSnippet,
  });
}
