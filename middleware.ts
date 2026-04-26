import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const DEFAULT_ALLOWED_ORIGINS = new Set([
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
]);

const CORS_METHODS = 'GET, POST, PUT, DELETE, OPTIONS';
const CORS_HEADERS = 'Content-Type, Authorization';
const MUTATING_METHODS = new Set(['POST', 'PUT', 'DELETE']);

function getAllowedOrigins(): Set<string> {
  const envOrigin = process.env.ALLOWED_ORIGIN?.trim();
  if (!envOrigin) {
    return DEFAULT_ALLOWED_ORIGINS;
  }

  // Поддерживаем как одно значение, так и список через запятую
  const parsed = envOrigin
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return new Set(parsed.length > 0 ? parsed : [...DEFAULT_ALLOWED_ORIGINS]);
}

function applyCorsHeaders(response: NextResponse, origin: string) {
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', CORS_METHODS);
  response.headers.set('Access-Control-Allow-Headers', CORS_HEADERS);
  response.headers.set('Vary', 'Origin');
}

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const origin = request.headers.get('origin');
  const method = request.method.toUpperCase();
  const allowedOrigins = getAllowedOrigins();
  const isAllowedOrigin = origin ? allowedOrigins.has(origin) : false;

  // Для preflight отвечаем только если origin разрешён
  if (method === 'OPTIONS') {
    if (!origin || !isAllowedOrigin) {
      return NextResponse.json({ error: 'CORS origin denied' }, { status: 403 });
    }

    const preflight = NextResponse.json(null, { status: 200 });
    applyCorsHeaders(preflight, origin);
    return preflight;
  }

  // Обратная совместимость: запросы без Origin (curl/сервер) пропускаем
  if (!origin) {
    return NextResponse.next();
  }

  // Блокируем мутации с недоверенных origin
  if (!isAllowedOrigin && MUTATING_METHODS.has(method)) {
    return NextResponse.json({ error: 'CORS origin denied' }, { status: 403 });
  }

  const response = NextResponse.next();

  // CORS заголовки выставляем только для разрешённых origin
  if (isAllowedOrigin) {
    applyCorsHeaders(response, origin);
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
