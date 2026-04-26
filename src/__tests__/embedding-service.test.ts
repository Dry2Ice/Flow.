import { describe, expect, it } from 'vitest';
import { chunkFile, cosineSimilarity } from '@/lib/embedding-service';

describe('embedding-service utilities', () => {
  describe('chunkFile', () => {
    it('returns one chunk for files <= 200 lines', () => {
      const content = Array.from({ length: 120 }, (_, i) => `line-${i + 1}`).join('\n');
      const chunks = chunkFile('small.ts', content);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].startLine).toBe(1);
      expect(chunks[0].endLine).toBe(120);
    });

    it('returns multiple chunks for files > 200 lines without data loss', () => {
      const lines = Array.from({ length: 450 }, (_, i) => `line-${i + 1}`);
      const content = lines.join('\n');
      const chunks = chunkFile('big.ts', content);

      expect(chunks.length).toBeGreaterThan(1);
      const reconstructed = chunks.map((chunk) => chunk.content).join('\n');
      expect(reconstructed).toBe(content);
      expect(chunks[0].startLine).toBe(1);
      expect(chunks.at(-1)?.endLine).toBe(450);
    });

    it('returns empty array for empty file', () => {
      const chunks = chunkFile('empty.ts', '');
      expect(chunks).toEqual([]);
    });

    it('splits around declaration boundaries', () => {
      const prelude = Array.from({ length: 130 }, (_, i) => `// prelude ${i + 1}`).join('\n');
      const body = [
        'export function firstFn() { return 1; }',
        ...Array.from({ length: 130 }, (_, i) => `const a${i} = ${i};`),
        'export function secondFn() { return 2; }',
        ...Array.from({ length: 40 }, (_, i) => `const b${i} = ${i};`),
      ].join('\n');

      const chunks = chunkFile('boundaries.ts', `${prelude}\n${body}`);
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[1].content.startsWith('export function firstFn')).toBe(true);
    });
  });

  describe('cosineSimilarity', () => {
    it('returns 1 for identical vectors', () => {
      expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 8);
    });

    it('returns 0 for orthogonal vectors', () => {
      expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 8);
    });

    it('returns 0 for empty arrays', () => {
      expect(cosineSimilarity([], [])).toBe(0);
    });

    it('returns 0 for vectors with different lengths', () => {
      expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
    });
  });
});
