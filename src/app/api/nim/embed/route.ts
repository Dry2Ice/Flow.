import { NextRequest, NextResponse } from 'next/server';
import { buildNimUrl, normalizeEndpointPath, normalizeNimBaseUrl } from '../url-utils';

export async function POST(request: NextRequest) {
  try {
    const { texts, model, baseUrl, embeddingsPath, endpointPath } = await request.json();
    const apiKey = process.env.NIM_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'NIM_API_KEY not configured on server',
          hint: 'Add NIM_API_KEY to .env.local',
        },
        { status: 503 }
      );
    }

    if (!Array.isArray(texts) || texts.length === 0 || !model || !baseUrl) {
      return NextResponse.json(
        { error: 'texts, model, and baseUrl are required' },
        { status: 400 }
      );
    }

    const normalizedBaseUrl = normalizeNimBaseUrl(baseUrl);
    if (!normalizedBaseUrl.ok) {
      return NextResponse.json({ error: normalizedBaseUrl.error }, { status: 400 });
    }

    const resolvedEmbeddingsPath = normalizeEndpointPath(embeddingsPath ?? endpointPath, '/embeddings');
    const response = await fetch(buildNimUrl(normalizedBaseUrl.value, resolvedEmbeddingsPath), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: texts,
        model,
      }),
      signal: AbortSignal.timeout(120_000),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Upstream error: ${response.status} ${response.statusText}`,
          cause: data?.error || data,
        },
        { status: response.status }
      );
    }

    const embeddings = Array.isArray(data?.data)
      ? data.data.map((item: any) => item.embedding).filter(Boolean)
      : [];

    return NextResponse.json({ embeddings });
  } catch (error) {
    console.error('Embedding proxy failed:', error);
    return NextResponse.json({ error: 'Failed to reach embedding endpoint' }, { status: 502 });
  }
}
