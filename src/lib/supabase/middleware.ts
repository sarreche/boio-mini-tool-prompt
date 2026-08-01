import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
          Object.entries(headers).forEach(([name, value]) => {
            response.headers.set(name, value);
          });
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();

  const pathname = request.nextUrl.pathname;
  const isAuthenticated = Boolean(data?.claims);
  const isProtected = pathname.startsWith("/prompts") || pathname.startsWith("/account") || pathname.startsWith("/admin");

  if (!isAuthenticated && isProtected) {
    return redirectWithCookies(request, response, "/login");
  }

  if (isAuthenticated && pathname === "/login") {
    return redirectWithCookies(request, response, "/prompts");
  }

  if (pathname === "/") {
    return redirectWithCookies(
      request,
      response,
      isAuthenticated ? "/prompts" : "/login",
    );
  }

  expireLegacyCookie(response);
  return response;
}

function redirectWithCookies(
  request: NextRequest,
  source: NextResponse,
  pathname: string,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  source.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  expireLegacyCookie(redirect);
  return redirect;
}

function expireLegacyCookie(response: NextResponse) {
  response.cookies.set("isAuthenticated", "", {
    expires: new Date(0),
    path: "/",
  });
}
