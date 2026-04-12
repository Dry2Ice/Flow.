// src/app/api/nim/config/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { nvidiaNimService } from '@/lib/nvidia-nim';

export async function POST(request: NextRequest) {
  try {
    const { apiKey, baseUrl, model } = await request.json();

    if (!apiKey || !baseUrl || !model) {
      return NextResponse.json(
        { error: 'Missing required fields: apiKey, baseUrl, model' },
        { status: 400 }
      );
    }

    nvidiaNimService.setConfig({ apiKey, baseUrl, model });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to configure Nvidia NIM:', error);
    return NextResponse.json(
      { error: 'Failed to configure Nvidia NIM service' },
      { status: 500 }
    );
  }
}