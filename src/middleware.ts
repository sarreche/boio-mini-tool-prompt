import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
 
/** Cambiá 'isAuthenticated' por el nombre real de tu cookie si querés */
function hasSession(req: NextRequest) {
  const cookie = req.cookies.get("isAuthenticated"); // o "session"
  return Boolean(cookie?.value);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authed = hasSession(req);

  // 1) Proteger /prompts y subrutas
  if (pathname.startsWith("/prompts")) {
    if (!authed) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // 2) Si autenticado y visita /login → enviar a /prompts
  if (pathname === "/login" && authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/prompts";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // 3) (Opcional) decidir la home "/" según sesión
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = authed ? "/prompts" : "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

/**
 * Solo interceptamos lo necesario.
 * No tocamos /api/*, _next/* ni archivos estáticos.
 */
export const config = {
  matcher: ["/", "/login", "/prompts", "/prompts/:path*"],
};
