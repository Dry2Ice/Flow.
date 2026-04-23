const BASE_URL_FORMAT_ERROR = 'Base URL must start with http:// or https:// and end with /v1 (example: https://integrate.api.nvidia.com/v1)';

export type NormalizedBaseUrlResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

export function normalizeNimBaseUrl(baseUrl: unknown): NormalizedBaseUrlResult {
  const trimmed = typeof baseUrl === 'string' ? baseUrl.trim() : '';

  if (!trimmed) {
    return { ok: false, error: 'Base URL is required' };
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return { ok: false, error: BASE_URL_FORMAT_ERROR };
  }

  try {
    const parsed = new URL(trimmed);
    const normalizedPath = parsed.pathname.replace(/\/+$/, '');

    if (!normalizedPath || normalizedPath === '/' || !normalizedPath.endsWith('/v1')) {
      return { ok: false, error: 'Base URL must end with /v1' };
    }

    const normalized = new URL(parsed.origin + normalizedPath);
    return { ok: true, value: normalized.toString().replace(/\/+$/, '') };
  } catch {
    return { ok: false, error: BASE_URL_FORMAT_ERROR };
  }
}

export function buildNimUrl(baseUrl: string, endpointPath: string): string {
  const normalizedPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  return new URL(normalizedPath, `${baseUrl}/`).toString();
}

export function normalizeEndpointPath(endpointPath: unknown, fallbackPath: string): string {
  const trimmed = typeof endpointPath === 'string' ? endpointPath.trim() : '';
  if (!trimmed) {
    return fallbackPath;
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}
