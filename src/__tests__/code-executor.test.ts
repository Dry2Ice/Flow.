import { beforeEach, describe, expect, it, vi } from 'vitest';
import { codeExecutor } from '@/lib/code-executor';

type Handler = ((...args: any[]) => void) | undefined;

function createIframeMock() {
  const handlers: Record<string, Handler> = {};
  const contentWindow = { postMessage: vi.fn() };
  const iframe = {
    style: { display: '' },
    setAttribute: vi.fn(),
    src: '',
    contentWindow,
    parentNode: { removeChild: vi.fn() },
    addEventListener: vi.fn((event: string, cb: Handler) => {
      handlers[event] = cb;
    }),
    removeEventListener: vi.fn(),
  };

  return { iframe, handlers, contentWindow };
}

describe('codeExecutor.executeJavaScript (iframe sandbox)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
  });

  it('returns success for simple JS', async () => {
    const { iframe, handlers } = createIframeMock();

    vi.spyOn(document, 'createElement').mockReturnValue(iframe as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation((() => {
      handlers.load?.();
      window.dispatchEvent(
        new MessageEvent('message', {
          source: iframe.contentWindow as any,
          origin: 'null',
          data: { type: 'sandbox-result', payload: { success: true, output: '4', logs: [] } },
        }),
      );
      return iframe as any;
    }) as any);

    const result = await codeExecutor.executeJavaScript('2 + 2', { files: {}, entryPoint: 'index.js' });
    expect(result.success).toBe(true);
    expect(result.output).toBe('4');
  });

  it('captures console logs', async () => {
    const { iframe, handlers } = createIframeMock();

    vi.spyOn(document, 'createElement').mockReturnValue(iframe as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation((() => {
      handlers.load?.();
      window.dispatchEvent(new MessageEvent('message', {
        source: iframe.contentWindow as any,
        origin: 'null',
        data: { type: 'sandbox-log', payload: { level: 'log', message: 'hello' } },
      }));
      window.dispatchEvent(new MessageEvent('message', {
        source: iframe.contentWindow as any,
        origin: 'null',
        data: { type: 'sandbox-result', payload: { success: true, output: '', logs: [] } },
      }));
      return iframe as any;
    }) as any);

    const result = await codeExecutor.executeJavaScript('console.log("hello")', { files: {}, entryPoint: 'index.js' });
    expect(result.success).toBe(true);
    expect(result.logs.some((log) => log.includes('hello'))).toBe(true);
  });

  it('returns error when sandbox responds with failure', async () => {
    const { iframe, handlers } = createIframeMock();

    vi.spyOn(document, 'createElement').mockReturnValue(iframe as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation((() => {
      handlers.load?.();
      window.dispatchEvent(new MessageEvent('message', {
        source: iframe.contentWindow as any,
        origin: 'null',
        data: { type: 'sandbox-result', payload: { success: false, output: '', error: 'Boom', logs: [] } },
      }));
      return iframe as any;
    }) as any);

    const result = await codeExecutor.executeJavaScript('throw new Error("Boom")', { files: {}, entryPoint: 'index.js' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Boom');
  });

  it('times out infinite loops after 5 seconds', async () => {
    const { iframe, handlers } = createIframeMock();

    vi.spyOn(document, 'createElement').mockReturnValue(iframe as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation((() => {
      handlers.load?.();
      return iframe as any;
    }) as any);

    const execution = codeExecutor.executeJavaScript('while(true){}', { files: {}, entryPoint: 'index.js' });
    await vi.advanceTimersByTimeAsync(5001);

    const result = await execution;
    expect(result.success).toBe(false);
    expect(result.error).toContain('Execution timed out after 5000ms');
  });
});
