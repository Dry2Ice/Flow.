import { describe, expect, it } from 'vitest';
import v1LayoutFixture from './fixtures/workspace-presets/v1-layout.json';
import v2EnvelopeFixture from './fixtures/workspace-presets/v2-envelope.json';
import brokenFixture from './fixtures/workspace-presets/broken.json';
import {
  migrateWorkspaceStorage,
  WORKSPACE_STORAGE_VERSION,
  DEFAULT_LAYOUT,
} from '@/lib/workspace-presets';

describe('workspace preset migrations smoke tests', () => {
  it('migrates v1 raw layout into v3 envelope', () => {
    const result = migrateWorkspaceStorage(v1LayoutFixture);

    expect(result.didRecover).toBe(false);
    expect(result.envelope.version).toBe(WORKSPACE_STORAGE_VERSION);
    expect(result.envelope.presets).toHaveLength(1);
    expect(result.envelope.presets[0].layout).toEqual(v1LayoutFixture);
    expect(result.envelope.activePresetId).toBe(result.envelope.presets[0].id);
  });

  it('migrates v2 storage into v3 envelope', () => {
    const result = migrateWorkspaceStorage(v2EnvelopeFixture);

    expect(result.didRecover).toBe(false);
    expect(result.envelope.version).toBe(WORKSPACE_STORAGE_VERSION);
    expect(result.envelope.presets[0].id).toBe('legacy-v2');
    expect(result.envelope.activePresetId).toBe('legacy-v2');
  });

  it('falls back to default layout and recovery preset for incompatible data', () => {
    const result = migrateWorkspaceStorage(brokenFixture);

    expect(result.didRecover).toBe(true);
    expect(result.envelope.presets).toHaveLength(1);
    expect(result.envelope.presets[0].isRecovery).toBe(true);
    expect(result.envelope.presets[0].layout).toEqual(DEFAULT_LAYOUT);
  });
});
