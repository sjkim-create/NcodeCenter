"use client";

// 프로토타입은 데모/등록계정 로그인만 쓴다 — 실 SSO(NextAuth SessionProvider)는 걷어냈다 `PC-116`.
//   레이아웃 호환을 위해 통과(pass-through) 래퍼로 남긴다.
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
