import { NextResponse, type NextRequest } from "next/server";
import { isAuthorized } from "@/lib/auth";

export function middleware(request: NextRequest) {
  if (isAuthorized(request.headers.get("authorization"))) {
    return NextResponse.next();
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Saksi"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
