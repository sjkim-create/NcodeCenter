// 라우트 보호 — 프로토타입 **데모 세션 쿠키(ncc_demo)** 로만 게이트한다 `PC-116`.
//   실 SSO(Google/NextAuth) 연결은 쓰지 않는다 — 로그인은 데모/등록계정 로그인이 이 쿠키를 세운다.
import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 공개 경로: 로그인 화면, 브랜드 가이드, API·정적 자원
  const isPublic =
    pathname === "/login" ||
    pathname === "/brand" ||
    pathname.startsWith("/api/");

  const loggedIn = req.cookies.get("ncc_demo")?.value === "1";

  if (!loggedIn && !isPublic) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // _next 정적파일, 파일 확장자(.svg 등), favicon 제외한 모든 경로
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
