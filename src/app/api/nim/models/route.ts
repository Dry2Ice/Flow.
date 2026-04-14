import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { apiKey, baseUrl } = await request.json();

    if (!apiKey || !baseUrl) {
      return NextResponse.json({ error: 'apiKey and baseUrl are required' }, { status: 400 });
    }

    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch models:', error);
    return NextResponse.json({ error: 'Failed to reach the API endpoint' }, { status: 502 });
  }
}