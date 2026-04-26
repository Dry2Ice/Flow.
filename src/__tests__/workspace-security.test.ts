import path from 'path';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  WorkspaceSecurityError,
  getConfiguredTrustedRoots,
  resolveWorkspacePath,
  runtimeTrustedRoots,
} from '@/lib/workspace-security';

describe('workspace-security', () => {
  const workspaceRoot = path.resolve('/tmp/workspace-root');
  const previousTrustedRoots = process.env.WORKSPACE_TRUSTED_ROOTS;

  beforeEach(() => {
    runtimeTrustedRoots.clear();
    delete process.env.WORKSPACE_TRUSTED_ROOTS;
  });

  afterEach(() => {
    runtimeTrustedRoots.clear();
    process.env.WORKSPACE_TRUSTED_ROOTS = previousTrustedRoots;
  });

  describe('resolveWorkspacePath', () => {
    it('returns valid path inside workspace', () => {
      const resolved = resolveWorkspacePath('src/index.ts', workspaceRoot);
      expect(resolved).toBe(path.resolve(workspaceRoot, 'src/index.ts'));
    });

    it('allows workspace root path', () => {
      const resolved = resolveWorkspacePath(workspaceRoot, workspaceRoot);
      expect(resolved).toBe(workspaceRoot);
    });

    it('throws on traversal path', () => {
      expect(() => resolveWorkspacePath('../../../etc/passwd', workspaceRoot)).toThrow(WorkspaceSecurityError);
    });

    it('throws on absolute path outside workspace', () => {
      expect(() => resolveWorkspacePath('/etc/passwd', workspaceRoot)).toThrow(WorkspaceSecurityError);
    });

    it('throws on path with null byte', () => {
      expect(() => resolveWorkspacePath('src/abc\0def.ts', workspaceRoot)).toThrow();
    });

    it('throws when path is too long', () => {
      const tooLongPath = 'a'.repeat(1025);
      expect(() => resolveWorkspacePath(tooLongPath, workspaceRoot)).toThrow(WorkspaceSecurityError);
    });
  });

  describe('getConfiguredTrustedRoots', () => {
    it('returns workspace root when env is empty', () => {
      const roots = getConfiguredTrustedRoots(workspaceRoot);
      expect(roots).toEqual([workspaceRoot]);
    });

    it('returns workspace root + env roots', () => {
      process.env.WORKSPACE_TRUSTED_ROOTS = '/opt/projects:/srv/shared';
      const roots = getConfiguredTrustedRoots(workspaceRoot);
      expect(roots).toHaveLength(3);
      expect(roots).toContain(workspaceRoot);
      expect(roots).toContain(path.resolve('/opt/projects'));
      expect(roots).toContain(path.resolve('/srv/shared'));
    });
  });
});
