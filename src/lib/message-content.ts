export const normalizeMessageContent = (content: unknown): string =>
  typeof content === 'string'
    ? content
    : Array.isArray(content)
      ? content.filter(Boolean).join('')
      : String(content ?? '');
