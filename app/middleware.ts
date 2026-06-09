import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Exemplo de captura de cookie de sessão estruturado (Ajuste conforme seu JWT)
  const token = request.cookies.get('sc-session-token')?.value;
  const userRole = request.cookies.get('sc-user-role')?.value; // 'admin' | 'secretaria' | 'cronometrista'

  const { pathname } = request.nextUrl;

  // Se tentar acessar o painel restrito sem token, manda pro Login
  if (!token && (pathname.startsWith('/admin') || pathname.startsWith('/secretaria') || pathname.startsWith('/cronometrista'))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Validação rígida de permissão por rota
  if (pathname.startsWith('/admin') && userRole !== 'admin') {
    return NextResponse.redirect(new URL('/login?error=negado', request.url));
  }

  if (pathname.startsWith('/secretaria') && userRole !== 'secretaria' && userRole !== 'admin') {
    return NextResponse.redirect(new URL('/login?error=negado', request.url));
  }

  if (pathname.startsWith('/cronometrista') && userRole !== 'cronometrista' && userRole !== 'admin') {
    return NextResponse.redirect(new URL('/login?error=negado', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/secretaria/:path*', '/cronometrista/:path*'],
};