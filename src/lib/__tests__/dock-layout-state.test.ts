import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_DOCKVIEW_LAYOUT,
  deserializeDockviewLayout,
  serializeDockviewLayout,
} from '../dock-layout';

test('serialize + deserialize returns equivalent dockview layout', () => {
  const serialized = serializeDockviewLayout(DEFAULT_DOCKVIEW_LAYOUT);
  const restored = deserializeDockviewLayout(serialized);

  assert.ok(restored);
  assert.deepEqual(restored, DEFAULT_DOCKVIEW_LAYOUT);
});

test('deserialize returns null for invalid schema', () => {
  const invalidLayout = JSON.stringify({
    grid: { root: { type: 'leaf', data: { id: '', views: ['editor'] } } },
    panels: {
      editor: { id: 'editor', title: 'Editor', contentComponent: '' },
    },
  });

  assert.equal(deserializeDockviewLayout(invalidLayout), null);
});

test('serialize throws for invalid layout input', () => {
  assert.throws(
    () => serializeDockviewLayout({ panels: {} }),
    /Invalid dockview layout/
  );
});
