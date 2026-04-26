import { AIQueueSlice, StoreGet, StoreSet } from '../types';

export const createAIQueueSlice = (set: StoreSet, get: StoreGet): AIQueueSlice => ({
  aiRequests: [],
  maxConcurrentRequests: 3,

  addAIRequest: (request) => set((state) => ({ aiRequests: [...state.aiRequests, request] })),

  updateAIRequest: (requestId, updates) => set((state) => ({
    aiRequests: state.aiRequests.map((request) => (request.id === requestId ? { ...request, ...updates } : request)),
  })),

  removeAIRequest: (requestId) => set((state) => ({ aiRequests: state.aiRequests.filter((request) => request.id !== requestId) })),

  getAIRequestByJobId: (jobId) => get().aiRequests.find((request) => request.jobId === jobId),

  getPendingRequests: () => get().aiRequests.filter((request) => request.status === 'pending'),

  getRunningRequests: () => get().aiRequests.filter((request) => request.status === 'running'),
});
