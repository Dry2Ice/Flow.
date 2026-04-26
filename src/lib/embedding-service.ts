import { embeddingCache, hashContent } from '@/lib/embedding-cache';

export interface EmbeddingConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  embeddingsPath?: string;
}

export interface CodeChunk {
  filePath: string;
  content: string;
  startLine: number;
  endLine: number;
  embedding?: number[];
}

const CHUNK_LINE_LIMIT = 200;
let activeEmbeddingConfig: EmbeddingConfig | null = null;

const sanitizeBaseUrl = (baseUrl: string) => baseUrl.trim().replace(/\/+$/, '');

const splitToWindows = (filePath: string, lines: string[], size = CHUNK_LINE_LIMIT): CodeChunk[] => {
  const chunks: CodeChunk[] = [];
  for (let start = 0; start < lines.length; start += size) {
    const end = Math.min(start + size, lines.length);
    const content = lines.slice(start, end).join('\n').trim();
    if (!content) continue;

    chunks.push({
      filePath,
      content,
      startLine: start + 1,
      endLine: end,
    });
  }

  return chunks;
};

export function chunkFile(filePath: string, content: string): CodeChunk[] {
  const lines = content.split('\n');

  if (lines.length <= CHUNK_LINE_LIMIT) {
    return [{ filePath, content, startLine: 1, endLine: lines.length || 1 }];
  }

  const declarationPattern = /^\s*(?:export\s+)?(?:async\s+)?(?:function|class|interface|type|const\s+\w+\s*=\s*(?:async\s*)?\(|let\s+\w+\s*=\s*(?:async\s*)?\(|var\s+\w+\s*=\s*(?:async\s*)?\()/;

  const chunks: CodeChunk[] = [];
  let chunkStart = 0;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const size = lineIndex - chunkStart;
    const isBoundary = declarationPattern.test(line) && size >= Math.floor(CHUNK_LINE_LIMIT * 0.6);
    const isTooLarge = size >= CHUNK_LINE_LIMIT;

    if (isBoundary || isTooLarge) {
      const contentSlice = lines.slice(chunkStart, lineIndex).join('\n').trim();
      if (contentSlice) {
        chunks.push({
          filePath,
          content: contentSlice,
          startLine: chunkStart + 1,
          endLine: lineIndex,
        });
      }
      chunkStart = lineIndex;
    }
  }

  const tailSlice = lines.slice(chunkStart).join('\n').trim();
  if (tailSlice) {
    chunks.push({
      filePath,
      content: tailSlice,
      startLine: chunkStart + 1,
      endLine: lines.length,
    });
  }

  return chunks.length > 0 ? chunks : splitToWindows(filePath, lines);
}

export async function getEmbedding(texts: string[]): Promise<number[][]> {
  if (!activeEmbeddingConfig) {
    throw new Error(
      'Embedding config is not set. Call embeddingService.setConfig(config) before use.'
    );
  }

  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  const response = await fetch('/api/nim/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      texts,
      model: activeEmbeddingConfig.model,
      baseUrl: sanitizeBaseUrl(activeEmbeddingConfig.baseUrl),
      embeddingsPath: activeEmbeddingConfig.embeddingsPath,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Failed to load embeddings');
  }

  return data.embeddings || [];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function findRelevantChunks(query: string, chunks: CodeChunk[], topK = 5): Promise<CodeChunk[]> {
  if (!query.trim() || chunks.length === 0) return [];

  const [queryEmbedding] = await getEmbedding([query]);
  if (!queryEmbedding) return [];

  const chunksWithoutEmbeddings = chunks.filter((chunk) => !chunk.embedding);
  if (chunksWithoutEmbeddings.length > 0) {
    const newEmbeddings = await getEmbedding(chunksWithoutEmbeddings.map((chunk) => chunk.content));
    chunksWithoutEmbeddings.forEach((chunk, index) => {
      chunk.embedding = newEmbeddings[index];
    });
  }

  return [...chunks]
    .filter((chunk) => chunk.embedding)
    .map((chunk) => ({
      chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding as number[]),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, topK)
    .map((item) => item.chunk);
}

export class EmbeddingService {
  private config: EmbeddingConfig | null = null;

  setConfig(config: EmbeddingConfig) {
    this.config = config;
    activeEmbeddingConfig = config;
  }

  async indexProject(projectFiles: Array<{ path: string; content: string }>, projectPath = ''): Promise<CodeChunk[]> {
    if (!this.config) {
      return [];
    }

    const chunks = projectFiles.flatMap((file) => chunkFile(file.path, file.content));
    if (chunks.length === 0) return [];
    const resolvedProjectPath = projectPath.trim() || '/';

    const enriched = await Promise.all(chunks.map(async (chunk) => {
      const chunkKey = `${chunk.filePath}:${chunk.startLine}-${chunk.endLine}`;
      const contentHash = hashContent(chunk.content);
      const embedding = await embeddingCache.get(resolvedProjectPath, chunkKey, contentHash);
      return { chunk, chunkKey, contentHash, embedding };
    }));

    const misses = enriched.filter((item) => !item.embedding);
    const missEmbeddings = misses.length > 0
      ? await getEmbedding(misses.map((item) => item.chunk.content))
      : [];

    const cacheWrites = misses.map((item, index) => ({
      filePath: item.chunkKey,
      content: item.chunk.content,
      contentHash: item.contentHash,
      startLine: item.chunk.startLine,
      endLine: item.chunk.endLine,
      embedding: missEmbeddings[index] ?? [],
      indexedAt: Date.now(),
      projectPath: resolvedProjectPath,
    }));

    if (cacheWrites.length > 0) {
      await embeddingCache.setMany(cacheWrites);
    }

    const fileCount = new Set(chunks.map((chunk) => chunk.filePath)).size;
    const hitFileCount = new Set(
      enriched.filter((item) => item.embedding).map((item) => item.chunk.filePath),
    ).size;
    console.info(
      `Cache hit: ${hitFileCount}/${fileCount} files, requesting embeddings for ${new Set(misses.map((item) => item.chunk.filePath)).size} files`,
    );

    return enriched.map((item, index) => ({
      ...item.chunk,
      embedding: item.embedding ?? missEmbeddings[misses.findIndex((miss) => miss === item)],
    }));
  }

  async search(query: string, chunks: CodeChunk[], topK = 5): Promise<CodeChunk[]> {
    if (!this.config) {
      return [];
    }

    return findRelevantChunks(query, chunks, topK);
  }
}

export const embeddingService = new EmbeddingService();
