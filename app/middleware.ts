// middleware.ts
import { auth } from "./auth"; // Ajuste o caminho conforme necessário
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  const nivelUser = req.auth?.user?.nivelUser;

  // 1. Proteção de Rota (Autenticação)
  if (!isLoggedIn && pathname !== "/login") {
    console.log("Usuário não autenticado, redirecionando para /login");
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Se o usuário já está logado e tenta ir para o login, joga ele para uma rota inicial
  if (isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url)); // Ou mude para a lógica de níveis se preferir
  }

  // 2. Proteção por Role (RBAC) - CORRIGIDO: Redireciona para fora da rota protegida
  if (pathname.startsWith("/admin") && nivelUser !== "A") {
    console.log("Acesso negado à rota /admin");
    return NextResponse.redirect(new URL("/login?error=AccessDenied", req.url)); 
  }

  if (pathname.startsWith("/secretaria") && !(nivelUser === "S" || nivelUser === "A")) {
    console.log("Acesso negado à rota /secretaria");
    return NextResponse.redirect(new URL("/login?error=AccessDenied", req.url));
  }

  if (pathname.startsWith("/cronometragem") && !(nivelUser === "C" || nivelUser === "A")) {
    console.log("Acesso negado à rota /cronometragem");
    return NextResponse.redirect(new URL("/login?error=AccessDenied", req.url));
  }

  return NextResponse.next();
});

// Importante: O matcher define onde o middleware atua
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|transmissao).*)"],
};