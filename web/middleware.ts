// 라우트 보호: 로그인 안 된 접근은 /login 으로. (회사 계정 SSO)
import { auth } from "@/auth";
import { NextResponse } from "next/server";

// SSO 자격증명(AUTH_GOOGLE_ID) 미설정 시에는 라우트 보호를 끈다(개발용 로컬 로그인 허용).
const SSO_CONFIGURED = !!process.env.AUTH_GOOGLE_ID;

export default auth((req) => {
  if (!SSO_CONFIGURED) return NextResponse.next();

  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // 공개 경로: 로그인 화면, 인증 API, 브랜드 가이드, 정적 자원
  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname === "/brand";

  if (!isLoggedIn && !isPublic) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  // _next 정적파일, 파일 확장자(.svg 등), favicon 제외한 모든 경로
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
