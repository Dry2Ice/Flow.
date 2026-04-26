import { embeddingService } from '@/lib/embedding-service';
import { EmbeddingSlice, StoreGet, StoreSet } from '../types';

export const createEmbeddingSlice = (set: StoreSet, get: StoreGet): EmbeddingSlice => ({
  projectChunks: [],
  isIndexingProject: false,
  indexedAt: null,
  isIndexStale: false,

  setIndexStale: (stale) => set({ isIndexStale: stale }),

  indexProjectForEmbedding: async () => {
    const state = get();
    if (!state.embeddingConfig || !state.projectPath.trim()) {
      set({ projectChunks: [], isIndexingProject: false, indexedAt: null, isIndexStale: false });
      return;
    }

    embeddingService.setConfig(state.embeddingConfig);
    set({ isIndexingProject: true });

    try {
      const projectResponse = await fetch('/api/project/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath: state.projectPath }),
      });
      const projectData = await projectResponse.json();
      const projectFiles = Array.isArray(projectData?.files) ? projectData.files : [];

      const chunks = await embeddingService.indexProject(projectFiles);
      set({ projectChunks: chunks, indexedAt: new Date(), isIndexStale: false });
    } catch (error) {
      console.error('Failed to index project for embeddings:', error);
      set({ projectChunks: [] });
    } finally {
      set({ isIndexingProject: false });
    }
  },
});
