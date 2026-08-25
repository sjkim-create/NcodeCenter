// 세션에 role 추가(회사 계정 로그인 → ADMIN/STAFF)
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      role?: "ADMIN" | "STAFF";
    } & import("next-auth").DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "ADMIN" | "STAFF";
  }
}
