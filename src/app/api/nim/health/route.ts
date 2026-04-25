import { NextRequest, NextResponse } from 'next/server';

const HEALTH_TIMEOUT_MS = 5_000;

function buildModelsUrl(baseUrl: string): string {
  return baseUrl.endsWith('/')
    ? `${baseUrl}v1/models`
    : `${baseUrl}/v1/models`;
}

function jsonError(error: string, status: number, details?: string) {
  return NextResponse.json(
    {
      healthy: false,
      error,
      ...(details ? { details } : {}),
      status,
    },
    { status }
  );
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = (request.headers.get('x-nim-key') || process.env.NIM_API_KEY || '').trim();
    const baseUrl = (request.headers.get('x-nim-baseurl') || process.env.NIM_BASE_URL || '').trim();

    if (!apiKey || !baseUrl) {
      return jsonError('Missing NIM credentials (apiKey/baseUrl)', 400);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

    try {
      const response = await fetch(buildModelsUrl(baseUrl), {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const upstreamBody = await response.text();
        console.error('NIM health upstream error body:', upstreamBody);
        return jsonError(
          `Upstream error: ${response.status} ${response.statusText}`,
          502,
          upstreamBody || 'No response body from upstream'
        );
      }

      return NextResponse.json({ healthy: true, status: 200 }, { status: 200 });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      return jsonError('Upstream request timed out after 5 seconds', 502);
    }

    console.error('NIM health check failed:', error);
    return jsonError('Failed to reach the API endpoint', 502);
  }
}
