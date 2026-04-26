import { AIMessage } from '@/types';
import { normalizeMessageContent, normalizeMessageId } from '@/lib/message-content';
import { SessionsSlice, SessionState, StoreGet, StoreSet } from '../types';

export const DEFAULT_SESSION_ID = 'default';
export const SESSION_STORAGE_KEY = 'flow.session.v1';
export const MAX_PERSISTED_MESSAGES = 20;

const isClient = typeof window !== 'undefined';

const normalizeStoredMessage = (message: Partial<AIMessage>): AIMessage => ({
  ...message,
  id: normalizeMessageId(message.id),
  role: message.role === 'assistant' ? 'assistant' : 'user',
  content: normalizeMessageContent(message.content),
  timestamp: message.timestamp instanceof Date
    ? message.timestamp
    : new Date(message.timestamp ?? Date.now()),
  isError: Boolean(message.isError),
  sessionId: typeof message.sessionId === 'string' ? message.sessionId : DEFAULT_SESSION_ID,
});

export const withStableMessageIds = (messages: Partial<AIMessage>[]): AIMessage[] => {
  const usedIds = new Set<string>();
  return messages.map((message) => {
    const normalized = normalizeStoredMessage(message);
    let stableId = normalized.id;

    while (usedIds.has(stableId)) {
      stableId = `${stableId}-dup`;
    }

    usedIds.add(stableId);
    return { ...normalized, id: stableId };
  });
};

export const createSessionsSlice = (set: StoreSet, get: StoreGet): SessionsSlice => ({
  sessions: {
    [DEFAULT_SESSION_ID]: {
      messages: [],
      isGenerating: false,
      activeRequests: 0,
    },
  },
  activeSessionId: DEFAULT_SESSION_ID,

  addMessage: (sessionId, message) => {
    set((state) => {
      const session = state.sessions[sessionId] ?? { messages: [], isGenerating: false, activeRequests: 0 };
      const usedIds = new Set(session.messages.map((existingMessage) => existingMessage.id));
      let messageId = normalizeMessageId(message.id);
      while (usedIds.has(messageId)) {
        messageId = `${messageId}-dup`;
      }
      const normalisedMessage = normalizeStoredMessage({ ...message, id: messageId, sessionId });

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            messages: [...session.messages, normalisedMessage],
          },
        },
      };
    });

    if (isClient && sessionId === DEFAULT_SESSION_ID) {
      try {
        const messages = get().sessions[DEFAULT_SESSION_ID]?.messages ?? [];
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ messages: messages.slice(-MAX_PERSISTED_MESSAGES) }));
      } catch {
        // ignore quota errors
      }
    }
  },

  setGenerating: (sessionId, generating) => set((state) => {
    const session = state.sessions[sessionId] ?? { messages: [], isGenerating: false, activeRequests: 0 };
    return {
      sessions: {
        ...state.sessions,
        [sessionId]: {
          ...session,
          isGenerating: generating,
          activeRequests: generating ? Math.max(1, session.activeRequests) : 0,
        },
      },
    };
  }),

  incrementSessionRequests: (sessionId) => set((state) => {
    const session = state.sessions[sessionId] ?? { messages: [], isGenerating: false, activeRequests: 0 };
    const activeRequests = session.activeRequests + 1;
    return {
      sessions: {
        ...state.sessions,
        [sessionId]: {
          ...session,
          activeRequests,
          isGenerating: activeRequests > 0,
        },
      },
    };
  }),

  decrementSessionRequests: (sessionId) => set((state) => {
    const session = state.sessions[sessionId] ?? { messages: [], isGenerating: false, activeRequests: 0 };
    const activeRequests = Math.max(0, session.activeRequests - 1);
    return {
      sessions: {
        ...state.sessions,
        [sessionId]: {
          ...session,
          activeRequests,
          isGenerating: activeRequests > 0,
        },
      },
    };
  }),

  setActiveSession: (sessionId) => set((state) => {
    const existing = state.sessions[sessionId];
    const normalisedSession = existing
      ? { ...existing, messages: withStableMessageIds(existing.messages) }
      : { messages: [], isGenerating: false, activeRequests: 0 };

    return {
      activeSessionId: sessionId,
      sessions: { ...state.sessions, [sessionId]: normalisedSession },
    };
  }),

  createSession: (sessionId = crypto.randomUUID()) => {
    set((state) => ({
      sessions: state.sessions[sessionId]
        ? state.sessions
        : { ...state.sessions, [sessionId]: { messages: [], isGenerating: false, activeRequests: 0 } },
      activeSessionId: sessionId,
    }));
    return sessionId;
  },

  clearSession: (sessionId) => set((state) => {
    const session = state.sessions[sessionId];
    if (!session) return state;

    if (isClient && sessionId === DEFAULT_SESSION_ID) {
      try {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      } catch {
        // ignore localStorage errors
      }
    }

    return {
      sessions: {
        ...state.sessions,
        [sessionId]: {
          ...session,
          messages: [],
        },
      },
    };
  }),

  getSessionState: (sessionId) => {
    const state = get();
    return state.sessions[sessionId] ?? ({ messages: [], isGenerating: false, activeRequests: 0 } as SessionState);
  },
});

export const rehydrateDefaultSessionMessages = (setState: (fn: (state: any) => any) => void) => {
  if (!isClient) return;

  try {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!saved) return;

    const parsed = JSON.parse(saved) as { messages: any[] };
    if (!Array.isArray(parsed.messages) || parsed.messages.length === 0) return;

    const restoredMessages = parsed.messages.map((message: any) => ({
      ...normalizeStoredMessage(message),
      sessionId: DEFAULT_SESSION_ID,
      timestamp: new Date(message.timestamp),
    }));
    const normalizedRestoredMessages = withStableMessageIds(restoredMessages);

    setTimeout(() => {
      setState((state) => ({
        sessions: {
          ...state.sessions,
          [DEFAULT_SESSION_ID]: {
            ...state.sessions[DEFAULT_SESSION_ID],
            messages: normalizedRestoredMessages,
          },
        },
      }));
    }, 0);
  } catch {
    // ignore corrupt localStorage
  }
};
