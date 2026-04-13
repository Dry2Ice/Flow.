// src/app/api/nim/config/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { nvidiaNimService } from '@/lib/nvidia-nim';

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validateNumberInRange(
  value: unknown,
  field: string,
  { min, max, integer = false }: { min?: number; max?: number; integer?: boolean }
): number {
  if (!isFiniteNumber(value)) {
    throw new Error(`Field \"${field}\" must be a valid number`);
  }

  if (integer && !Number.isInteger(value)) {
    throw new Error(`Field \"${field}\" must be an integer`);
  }

  if (min !== undefined && value < min) {
    throw new Error(`Field \"${field}\" must be >= ${min}`);
  }

  if (max !== undefined && value > max) {
    throw new Error(`Field \"${field}\" must be <= ${max}`);
  }

  return value;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, baseUrl, model } = body;

    if (!apiKey || !baseUrl || !model) {
      return NextResponse.json(
        { error: 'Missing required fields: apiKey, baseUrl, model' },
        { status: 400 }
      );
    }

    const config: Parameters<typeof nvidiaNimService.setConfig>[0] = {
      apiKey,
      baseUrl,
      model,
    };

    if (body.temperature !== undefined) {
      config.temperature = validateNumberInRange(body.temperature, 'temperature', { min: 0, max: 2 });
    }

    if (body.topP !== undefined) {
      config.topP = validateNumberInRange(body.topP, 'topP', { min: 0, max: 1 });
    }

    if (body.topK !== undefined) {
      config.topK = validateNumberInRange(body.topK, 'topK', { min: 1, integer: true });
    }

    if (body.contextTokens !== undefined) {
      config.contextTokens = validateNumberInRange(body.contextTokens, 'contextTokens', { min: 0, integer: true });
    }

    if (body.maxTokens !== undefined) {
      config.maxTokens = validateNumberInRange(body.maxTokens, 'maxTokens', { min: 1, integer: true });
    }

    if (body.presencePenalty !== undefined) {
      config.presencePenalty = validateNumberInRange(body.presencePenalty, 'presencePenalty', { min: -2, max: 2 });
    }

    if (body.frequencyPenalty !== undefined) {
      config.frequencyPenalty = validateNumberInRange(body.frequencyPenalty, 'frequencyPenalty', { min: -2, max: 2 });
    }

    if (body.stopSequences !== undefined) {
      if (!Array.isArray(body.stopSequences)) {
        throw new Error('Field "stopSequences" must be an array of strings');
      }

      const normalizedStopSequences = body.stopSequences
        .filter((item: unknown): item is string => typeof item === 'string')
        .map((item: string) => item.trim())
        .filter((item: string) => item.length > 0);

      if (normalizedStopSequences.length === 0) {
        throw new Error('Field "stopSequences" must contain at least one non-empty string');
      }

      config.stopSequences = normalizedStopSequences;
    }

    nvidiaNimService.setConfig(config);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Field')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Failed to configure Nvidia NIM:', error);
    return NextResponse.json(
      { error: 'Failed to configure Nvidia NIM service' },
      { status: 500 }
    );
  }
}
