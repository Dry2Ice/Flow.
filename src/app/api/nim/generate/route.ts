import { NextRequest, NextResponse } from 'next/server';
import { buildNimUrl, normalizeNimBaseUrl } from '../url-utils';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const shouldStream = url.searchParams.get('stream') === 'true';

    const nimKeyFromHeader = request.headers.get('x-nim-key');
    const baseUrlFromHeader = request.headers.get('x-nim-baseurl');
    const apiKey = nimKeyFromHeader || process.env.NIM_API_KEY;
    const baseUrl = baseUrlFromHeader || process.env.NIM_BASE_URL;

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing NIM API key' }, { status: 400 });
    }

    if (!baseUrl) {
      return NextResponse.json({ error: 'Missing NIM base URL' }, { status: 400 });
    }

    const normalizedBaseUrl = normalizeNimBaseUrl(baseUrl);
    if (!normalizedBaseUrl.ok) {
      return NextResponse.json({ error: normalizedBaseUrl.error }, { status: 400 });
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
