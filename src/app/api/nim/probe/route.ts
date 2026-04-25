import { NextRequest, NextResponse } from 'next/server';
import { buildNimUrl, normalizeNimBaseUrl } from '../url-utils';

export async function POST(request: NextRequest) {
  try {
    const { apiKey, baseUrl, model, message = 'Hello' } = await request.json();

    if (!apiKey || !baseUrl || !model) {
      return NextResponse.json({ error: 'apiKey, baseUrl, and model are required' }, { status: 400 });
    }

    const normalizedBaseUrl = normalizeNimBaseUrl(baseUrl);
    if (!normalizedBaseUrl.ok) {
      return NextResponse.json({ error: normalizedBaseUrl.error }, { status: 400 });
    }

    const response = await fetch(buildNimUrl(normalizedBaseUrl.value, '/chat/completions'), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: message }],
        max_tokens: 50,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const upstreamBody = await response.text();
      return NextResponse.json(
        {
          error: `Upstream error: ${response.status} ${response.statusText}`,
          cause: upstreamBody || response.statusText,
          status: response.status,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Probe request failed:', error);

    const causeRaw = String(
      error?.cause?.code ||
      error?.cause?.errno ||
      error?.code ||
      error?.cause?.message ||
      error?.message ||
      'UNKNOWN_ERROR'
    );
    const cause = causeRaw.toUpperCase();

    let friendlyError = 'Failed to reach the API endpoint';
    if (cause.includes('ECONNREFUSED')) {
      friendlyError = 'Сервер недоступен';
    } else if (cause.includes('ENOTFOUND')) {
      friendlyError = 'Неверный хост';
    } else if (cause.includes('CERT_') || cause.includes('SELF_SIGNED_CERT') || cause.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE')) {
      friendlyError = 'Ошибка SSL';
    } else if (cause.includes('TIMEOUT') || cause.includes('ABORT')) {
      friendlyError = 'Превышено время ожидания (30 секунд)';
    }

    return NextResponse.json(
      { error: friendlyError, cause: causeRaw, status: 502 },
      { status: 502 }
    );
  }
}
