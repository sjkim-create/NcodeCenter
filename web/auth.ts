// 회사 계정(Google Workspace) SSO — Auth.js(NextAuth v5)
// 인증(누구인가)= Google 회사 계정, @neolab.net 도메인만 허용.
// 권한(역할)= staffUsers 명단으로 매핑(브리지는 authStore에서 처리).
//
// 실제 자격증명은 코드에 넣지 않는다 → .env.local (gitignore):
//   AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET
// IdP가 Microsoft 365/Azure AD면 Google → MicrosoftEntraID provider로 교체.
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { STAFF_USERS } from "@/lib/staffUsers";

// 허용 회사 도메인 (쉼표로 복수 지정 가능: ALLOWED_EMAIL_DOMAINS="neolab.net,neostudio.team")
const ALLOWED_DOMAINS = (process.env.ALLOWED_EMAIL_DOMAINS ?? "neolab.net")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

function isAllowedEmail(email?: string | null): boolean {
  if (!email) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && ALLOWED_DOMAINS.includes(domain);
}

// 명단(staffUsers) 기반 역할 매핑. 명단에 없으면 STAFF(기본, "미승인" 상태는 authStore에서 관리).
function roleFor(email: string): "ADMIN" | "STAFF" {
  const hit = STAFF_USERS.find((u) => u.id.toLowerCase() === email.toLowerCase());
  return hit?.role ?? "STAFF";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Google Workspace 조직 힌트(hd) — 회사 계정이 로그인돼 있으면 계정 선택창 없이 자동 진행.
      // 도메인 강제는 아래 signIn 콜백에서 서버측으로 재검증한다.
      authorization: { params: { hd: ALLOWED_DOMAINS[0] } },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    // 회사 도메인 이외 계정은 로그인 거부
    signIn({ profile, user }) {
      const email = profile?.email ?? user?.email;
      return isAllowedEmail(email);
    },
    // 역할을 토큰/세션에 실어 클라이언트에서 사용
    jwt({ token }) {
      if (token.email) token.role = roleFor(token.email);
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = (token.role as "ADMIN" | "STAFF") ?? "STAFF";
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
  trustHost: true,
});
