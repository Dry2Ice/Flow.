import { describe, expect, it, vi, afterEach } from 'vitest';

import { POST } from './route';

describe('POST /api/nim/models', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses /models when baseUrl already ends in /v1', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const response = await POST(
      new Request('http://localhost/api/nim/models', {
        method: 'POST',
        body: JSON.stringify({
          apiKey: 'test-key',
          baseUrl: 'https://integrate.api.nvidia.com/v1',
        }),
      }) as any
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://integrate.api.nvidia.com/models');
  });

  it('normalizes trailing slash on /v1/', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const response = await POST(
      new Request('http://localhost/api/nim/models', {
        method: 'POST',
        body: JSON.stringify({
          apiKey: 'test-key',
          baseUrl: 'https://integrate.api.nvidia.com/v1/',
        }),
      }) as any
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://integrate.api.nvidia.com/models');
  });

  it('returns 400 for invalid base URL format', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    const response = await POST(
      new Request('http://localhost/api/nim/models', {
        method: 'POST',
        body: JSON.stringify({
          apiKey: 'test-key',
          baseUrl: 'integrate.api.nvidia.com/v1',
        }),
      }) as any
    );

    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('http:// or https://');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
