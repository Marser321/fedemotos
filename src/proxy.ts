import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, leerSesionDesdeCookie } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = leerSesionDesdeCookie(sessionCookie);

  if (pathname.startsWith("/admin")) {
    if (!session || session.role !== "admin") {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      loginUrl.searchParams.set("mode", "admin");
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname.startsWith("/mi-cuenta")) {
    if (!session || session.role !== "cliente") {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/mi-cuenta/:path*"],
};
