"use client";

// 프로토타입 로그인 — **데모 전용**(+등록 계정 로그인). 실 SSO(Google) 연결은 쓰지 않는다 `PC-116`.
//   로그인은 데모 세션 쿠키(ncc_demo)만 세우고, 미들웨어는 그 쿠키로 게이트한다.
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { S, Field } from "./ui";
import { auth, useAuth, currentUser } from "@/lib/authStore";

export default function LoginView() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/";
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

  // 데모 입장 — 관리자로 즉시 콘솔. 승인요청 시연을 위해 [고객사 관리]로 이동.
  const doDemo = () => {
    const r = auth.demoLogin();
    setMsg({ ok: r.ok, text: r.msg });
    if (r.ok) router.push("/companies");
  };

  // 등록 계정 로그인 (이메일 + 비밀번호, 초기 비밀번호 = 이메일)
  const doLogin = () => {
    const r = auth.login(email.trim(), pw);
    setMsg({ ok: r.ok, text: r.msg });
    if (r.ok) {
      try { remember ? localStorage.setItem("ncc-last-email", email.trim()) : localStorage.removeItem("ncc-last-email"); } catch { /* */ }
      router.push(from);
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
          프로토타입 — <b>데모</b>로 바로 들어가거나, 등록된 계정으로 로그인하세요. (내부 직원 전용)
        </p>

        {/* 데모 입장 — 기본 경로 */}
        <button onClick={doDemo} style={{ ...S.primary, width: "100%", padding: "12px 16px" }}>🧪 데모로 들어가기 (관리자)</button>
        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8, lineHeight: 1.6 }}>
          Google 로그인 없이 관리자로 입장해 전체 화면을 시연합니다. (실제 데이터 아님 · 프로토타입 전용)
        </div>

        {/* 등록 계정 로그인 (선택) */}
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px dashed #e5e7eb" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8 }}>등록 계정으로 로그인</div>
          <Field label="이메일"><input style={S.input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@neolab.net" onKeyDown={(e) => e.key === "Enter" && doLogin()} /></Field>
          <div style={{ marginTop: 10 }}>
            <Field label="비밀번호"><input type="password" style={S.input} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="비밀번호 (초기값 = 이메일)" onKeyDown={(e) => e.key === "Enter" && doLogin()} /></Field>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280", marginTop: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> 로그인 계정 기억
          </label>
          <button onClick={doLogin} style={{ ...S.ghost, width: "100%", marginTop: 10 }}>로그인</button>
          <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 10 }}>
            초기 비밀번호 = 이메일. 예: {s.users.slice(0, 2).map((u) => u.email).join(" · ")}
          </div>
        </div>

        {msg && <div style={{ marginTop: 12, fontSize: 12.5, color: msg.ok ? "#047857" : "#dc2626" }}>{msg.text}</div>}
      </div>
    </div>
  );
}
