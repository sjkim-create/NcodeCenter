"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { S, Field } from "./ui";
import { auth, useAuth, currentUser } from "@/lib/authStore";

export default function LoginView() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/";
  const authError = params.get("error");
  const s = useAuth();
  const me = currentUser(s);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [remember, setRemember] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // 재로그인 시 마지막 로그인 이메일 기억(자동 채움)
  useEffect(() => {
    try { const last = localStorage.getItem("ncc-last-email"); if (last) setEmail(last); } catch { /* */ }
  }, []);

  // 이미 로그인돼 있으면 즉시 콘솔로 이동 (로그인 화면 잔상 방지)
  useEffect(() => { if (me) router.replace(from); }, [me, from, router]);

  // Google SSO 는 OAuth 자격증명이 설정된 경우에만 노출/자동로그인 (미설정 시 회사 계정 로그인만)
  const ssoOn = process.env.NEXT_PUBLIC_SSO === "1";
  const autoOn = process.env.NEXT_PUBLIC_AUTOLOGIN === "1";
  useEffect(() => {
    if (!ssoOn || !autoOn || me || authError) return;
    try {
      if (sessionStorage.getItem("ncc-autologin") === "1") return;   // 취소/루프 방지: 세션당 1회
      sessionStorage.setItem("ncc-autologin", "1");
    } catch { /* */ }
    signIn("google", { callbackUrl: from });
  }, [ssoOn, autoOn, me, authError, from]);

  const doSSO = () => signIn("google", { callbackUrl: from });

  // 회사 등록 계정 로그인 (이메일 + 비밀번호, 초기 비밀번호 = 이메일). 성공 시 콘솔로 이동
  const doLogin = () => {
    const r = auth.login(email.trim(), pw);
    setMsg({ ok: r.ok, text: r.msg });
    if (r.ok) {
      try { remember ? localStorage.setItem("ncc-last-email", email.trim()) : localStorage.removeItem("ncc-last-email"); } catch { /* */ }
      router.push("/");
    }
  };

  // 이미 로그인 상태면 로그인 폼을 그리지 않음 (콘솔로 이동 중 — 잔상 방지)
  if (me) return null;

  return (
    <div style={{ maxWidth: 460, margin: "40px auto", padding: "0 20px" }}>
      <div style={{ ...S.card, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.svg" alt="NcodeCenter" width={30} height={30} />
          <div style={{ fontWeight: 700, fontSize: 18 }}>Ncode<span style={{ color: "#5f8ff0" }}>Center</span> 로그인</div>
        </div>
        <p style={{ color: "#6b7280", fontSize: 12.5, margin: "0 0 16px" }}>
          {ssoOn ? <>회사 <b>Google 계정</b>으로 로그인하세요. <b>@neolab.net</b> 계정이면 승인 없이 바로 이용할 수 있습니다.</>
                 : <>회사에 <b>등록된 계정</b>으로 로그인하세요. (내부 직원 전용 · <b>@neolab.net</b>)</>}
        </p>

        {authError && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "#b91c1c", marginBottom: 14 }}>
            {authError === "AccessDenied" ? "회사 계정(@neolab.net)만 로그인할 수 있습니다." : "Google 로그인 중 오류가 발생했습니다. 다시 시도하세요."}
          </div>
        )}

        {ssoOn ? (
          /* 회사 Google 계정(SSO)만 — OAuth 자격증명 설정 시 */
          <>
            <button onClick={doSSO} style={{ ...S.primary, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "12px 16px" }}>
              <GoogleG />회사 Google 계정으로 로그인
            </button>
            <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 10 }}>@neolab.net 회사 Google 계정만 허용되며, 최초 로그인 시 자동으로 등록됩니다(승인 불필요).</div>
          </>
        ) : (
          /* 회사 등록 계정 이메일+비밀번호 (OAuth 설정 전) */
          <>
            <Field label="이메일"><input style={S.input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@neolab.net" onKeyDown={(e) => e.key === "Enter" && doLogin()} /></Field>
            <div style={{ marginTop: 10 }}>
              <Field label="비밀번호"><input type="password" style={S.input} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="비밀번호 (초기값 = 이메일)" onKeyDown={(e) => e.key === "Enter" && doLogin()} /></Field>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280", marginTop: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> 로그인 계정 기억
            </label>
            <button onClick={doLogin} style={{ ...S.primary, width: "100%", marginTop: 10 }}>로그인</button>
            {msg && <div style={{ marginTop: 10, fontSize: 12.5, color: msg.ok ? "#047857" : "#dc2626" }}>{msg.text}</div>}
            <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 10 }}>등록 계정의 초기 비밀번호는 <b>이메일과 동일</b>합니다 (개인정보수정에서 변경). 신규 계정은 <b>회사 Google 계정</b> 인증으로 등록됩니다.</div>
          </>
        )}
      </div>
    </div>
  );
}

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.3 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C40.9 36 44 30.6 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}
