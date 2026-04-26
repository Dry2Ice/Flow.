import { NextRequest, NextResponse } from 'next/server';

import { buildNimUrl, normalizeNimBaseUrl } from '../url-utils';

const MODELS_TIMEOUT_MS = 5_000;

function jsonError(error: string, status: number, details?: string, extra?: Record<string, unknown>) {
  return NextResponse.json(
    {
      error,
      ...(details ? { details } : {}),
      ...(extra ?? {}),
      status,
    },
    { status }
  );
}

export async function POST(request: NextRequest) {
  let upstreamResponseBody = '';

  try {
    const body = await request.json();
    const apiKey = process.env.NIM_API_KEY;
    const envBaseUrl = process.env.NIM_BASE_URL?.trim() ?? '';
    const bodyBaseUrl = typeof body?.baseUrl === 'string' ? body.baseUrl.trim() : '';
    const baseUrl = envBaseUrl || bodyBaseUrl;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'NIM_API_KEY not configured on server',
          hint: 'Add NIM_API_KEY to .env.local',
        },
        { status: 503 }
      );
    }

    if (!baseUrl) {
      return jsonError('baseUrl is required', 400);
    }

    const normalizedBaseUrl = normalizeNimBaseUrl(baseUrl);
    if (!normalizedBaseUrl.ok) {
      return jsonError(normalizedBaseUrl.error, 400);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MODELS_TIMEOUT_MS);

    try {
      const response = await fetch(buildNimUrl(normalizedBaseUrl.value, '/models'), {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        upstreamResponseBody = await response.text();
        console.error('NIM models upstream error body:', upstreamResponseBody);

        return jsonError(
          `Upstream error: ${response.status} ${response.statusText}`,
          502,
          upstreamResponseBody || 'No response body from upstream',
          {
            upstreamStatus: response.status,
            upstreamStatusText: response.statusText,
          }
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    } finally {
      clearTimeout(timeout);
    }
  } catch (error: any) {
    const isTimeout = error?.name === 'AbortError';

    if (upstreamResponseBody) {
      console.error('NIM models upstream error body (catch):', upstreamResponseBody);
    }

    console.error('Failed to fetch NIM models:', error);

    if (isTimeout) {
      return jsonError('Upstream request timed out after 5 seconds', 502);
    }

    return jsonError('Failed to reach the API endpoint', 502);
  }
}
