import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// A quick cookie check so signed-out visitors go straight to the sign-in page.
// Every page and action still checks the session properly.
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|sign-in|_next/static|_next/image|icon|apple-icon|manifest|robots|.*\\.(?:png|svg|ico|webmanifest|txt)$).*)",
  ],
};
