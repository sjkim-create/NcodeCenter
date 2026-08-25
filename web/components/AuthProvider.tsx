"use client";

// 회사 계정 세션(NextAuth)을 앱 전역에 제공 + 기존 authStore와 동기화하는 브리지.
// 이렇게 하면 useAuth()/currentUser()를 쓰는 기존 화면들이 그대로 동작한다.
import { SessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";
import { auth } from "@/lib/authStore";

function AuthBridge() {
  const { data: session, status } = useSession();
  useEffect(() => {
    if (status !== "authenticated") return;           // NextAuth 세션이 있을 때만 반영
    const u = session?.user;                            // (세션 없음 = 회사계정 로그인 미사용 → 로컬 자격증명 로그인을 지우지 않음)
    if (u?.email) auth.setSession({ email: u.email, name: u.name ?? u.email, role: u.role ?? "STAFF" });
  }, [session, status]);
  return null;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthBridge />
      {children}
    </SessionProvider>
  );
}
