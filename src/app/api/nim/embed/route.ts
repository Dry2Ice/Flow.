import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { texts, model, apiKey, baseUrl } = await request.json();

    if (!Array.isArray(texts) || texts.length === 0 || !model || !apiKey || !baseUrl) {
      return NextResponse.json(
        { error: 'texts, model, apiKey, and baseUrl are required' },
        { status: 400 }
      );
    }

    const normalizedBaseUrl = String(baseUrl).trim().replace(/\/+$/, '');
    const response = await fetch(`${normalizedBaseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: texts,
        model,
      }),
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
