import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { apiKey, baseUrl, model, message = 'Hello' } = await request.json();

    if (!apiKey || !baseUrl || !model) {
      return NextResponse.json({ error: 'apiKey, baseUrl, and model are required' }, { status: 400 });
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: message }],
        max_tokens: 50,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${response.status} ${response.statusText}`, status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Probe request failed:', error);
    return NextResponse.json({ error: 'Failed to reach the API endpoint' }, { status: 502 });
  }
}