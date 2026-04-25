const createFallbackMessageId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const normalizeMessageContent = (content: unknown): string =>
  typeof content === 'string'
    ? content
    : String(content ?? '');

export const normalizeMessageId = (id: unknown): string =>
  typeof id === 'string' && id.trim().length > 0
    ? id
    : createFallbackMessageId();
