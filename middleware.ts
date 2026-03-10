import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("hmo_jwt")?.value;
  const { pathname } = req.nextUrl;

  const isAuthenticated = !!token;

  if (!isAuthenticated) {
    if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    if (pathname.startsWith("/events") || pathname.startsWith("/tickets")) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  if (isAuthenticated) {
    if (pathname === "/" || pathname === "/login") {
      return NextResponse.redirect(new URL("/events", req.url));
    }
    if (pathname === "/admin/login") {
      return NextResponse.redirect(new URL("/admin/events", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/complete-profile", "/events/:path*", "/admin/:path*", "/tickets/:path*"],
};
