import { NextRequest, NextResponse } from 'next/server';
import { buildNimUrl, normalizeNimBaseUrl } from '../url-utils';
import { nimRateLimiter } from '@/lib/rate-limiter';

export const maxDuration = 120;

const MAX_REQUESTS_PER_MINUTE = 20;

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const shouldStream = url.searchParams.get('stream') === 'true';

    const apiKey = process.env.NIM_API_KEY;
    const baseUrl = process.env.NIM_BASE_URL;

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
      return NextResponse.json(
        {
          error: 'NIM_BASE_URL not configured on server',
          hint: 'Add NIM_BASE_URL to .env.local',
        },
        { status: 503 }
      );
    }

    const normalizedBaseUrl = normalizeNimBaseUrl(baseUrl);
    if (!normalizedBaseUrl.ok) {
      return NextResponse.json({ error: normalizedBaseUrl.error }, { status: 400 });
    }

    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown';

    const limit = nimRateLimiter.check(clientIp, {
      maxRequests: MAX_REQUESTS_PER_MINUTE,
      windowMs: 60_000,
    });

    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', resetAt: limit.resetAt },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((limit.resetAt - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(MAX_REQUESTS_PER_MINUTE),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    const body = await request.json();
    const upstreamResponse = await fetch(buildNimUrl(normalizedBaseUrl.value, '/chat/completions'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });

    if (!upstreamResponse.ok) {
      const upstreamBody = await upstreamResponse.text();
      return NextResponse.json(
        {
          error: `Upstream error: ${upstreamResponse.status} ${upstreamResponse.statusText}`,
          cause: upstreamBody || upstreamResponse.statusText,
          status: upstreamResponse.status,
        },
        { status: upstreamResponse.status }
      );
    }

    if (shouldStream) {
      return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        headers: {
          'Content-Type': upstreamResponse.headers.get('content-type') || 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    const data = await upstreamResponse.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('NIM generate request failed:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate completion' },
      { status: 500 }
    );
  }
}
