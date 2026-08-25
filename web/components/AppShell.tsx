"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { MENU, titleOf, type MenuItem } from "@/lib/menu";
import { useAuth, currentUser, auth } from "@/lib/authStore";
import { S as UIS, Modal, Field } from "./ui";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState<{ name: string; password: string } | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const authState = useAuth();
  const me = currentUser(authState);
  const isAdmin = me?.role === "ADMIN";   // 활동 로그 등 admin 전용 메뉴 노출 기준

  // 로그인 화면 도달 시 로그아웃 전환 화면 해제
  useEffect(() => { if (pathname === "/login") setLoggingOut(false); }, [pathname]);
  const doLogout = () => {
    setMenuOpen(false);
    setLoggingOut(true);        // 셸 대신 전환 화면 → "비로그인" 잔상 방지
    router.replace("/login");
    auth.logout();
    signOut({ redirect: false });
  };
  const saveProfile = () => {
    if (!me || !profile) return;
    auth.updateUser(me.id, { name: profile.name.trim() || me.name });
    if (profile.password.trim()) auth.changePassword(me.id, profile.password.trim());
    setProfile(null);
  };

  // 로그아웃 전환 중에는 셸을 렌더하지 않음 (잔상 방지)
  if (loggingOut) {
    return (
      <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "#fff", color: "#9ca3af", fontSize: 13 }}>
        로그아웃 중…
      </div>
    );
  }
  // 로그인 화면은 셸(사이드바) 없이 표시
  if (pathname === "/login") return <>{children}</>;
  // 가장 긴 매칭 경로 1개만 active (부모/자식 동시 활성 방지)
  const best = MENU.flatMap((g) => g.items.map((i) => i.path))
    .filter((p) => p && (p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(p + "/")))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside style={{ ...S.sidebar, width: open ? SIDEBAR_W : RAIL_W }}>
        {open ? (
        <>
        <div style={S.brand}>
          <Link href="/brand" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flex: 1, minWidth: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.svg" alt="NcodeCenter" width={34} height={34} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: -0.2, color: "#1f2937" }}>
                Ncode<span style={{ color: "#5f8ff0" }}>Center</span>
              </div>
              <div style={{ fontSize: 10, color: "#9ca3af" }}>Ncode 자동관리</div>
            </div>
          </Link>
          <button onClick={() => setOpen(false)} title="메뉴 접기" style={S.collapseBtn}>«</button>
        </div>

        <nav style={{ padding: "6px 10px", overflowY: "auto", flex: 1 }}>
          {MENU.map((grp, gi) => {
            const items = grp.items.filter((it) => !it.admin || isAdmin);   // admin 전용 메뉴 필터
            if (items.length === 0) return null;
            return (
              <div key={gi} style={{ marginBottom: 10 }}>
                {grp.group && <div style={S.groupLabel}>{grp.group}</div>}
                {renderItems(items, best)}
              </div>
            );
          })}
        </nav>

        <div style={S.upsell}>
          내부 직원 전용 콘솔<br />
          <span style={{ color: "#787891", fontSize: 11 }}>업체·코드·현황 관리</span>
        </div>
        </>
        ) : (
          <div style={S.rail}>
            <button onClick={() => setOpen(true)} title="메뉴 펼치기" style={S.railLogo}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-mark.svg" alt="NcodeCenter" width={32} height={32} />
            </button>
            <button onClick={() => setOpen(true)} title="메뉴 펼치기" style={S.railExpand}>»</button>
          </div>
        )}
      </aside>

      {/* Main */}
      <div style={{ flex: 1, marginLeft: open ? SIDEBAR_W : RAIL_W, minWidth: 0, transition: "margin-left .15s" }}>
        <header style={S.topbar}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{titleOf(pathname)}</div>
          <div style={{ flex: 1 }} />
          <div style={S.iconBtn}>🔔</div>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => (me ? setMenuOpen((v) => !v) : router.push("/login"))}
              style={{ ...S.user, background: "none", border: 0, cursor: "pointer", color: "inherit" }}
              title="계정"
            >
              <span style={S.avatar}>{me ? me.name.slice(-2) : "?"}</span>
              <div style={{ lineHeight: 1.2, textAlign: "left" }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{me ? me.name : "비로그인"} {me && <span style={{ fontSize: 9, color: "#c0c6d0" }}>▾</span>}</div>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>{me ? me.role : "로그인 필요"}</div>
              </div>
            </button>
            {menuOpen && me && (
              <div style={S.userMenu}>
                <button onClick={() => { setMenuOpen(false); setProfile({ name: me.name, password: "" }); }} style={S.menuItem}>개인정보수정</button>
                <button onClick={doLogout} style={{ ...S.menuItem, color: "#dc2626" }}>로그아웃</button>
              </div>
            )}
          </div>
        </header>
        <main>{children}</main>
      </div>

      {profile && me && (
        <Modal onClose={() => setProfile(null)} title="개인정보 수정">
          <div style={{ display: "grid", gap: 12 }}>
            <Field label="이름"><input style={UIS.input} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></Field>
            <Field label="이메일"><input style={{ ...UIS.input, background: "#f3f4f6", color: "#6b7280" }} value={me.email} readOnly /></Field>
            <Field label="새 비밀번호"><input type="password" style={UIS.input} value={profile.password} onChange={(e) => setProfile({ ...profile, password: e.target.value })} placeholder="변경 시에만 입력" /></Field>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button onClick={() => setProfile(null)} style={UIS.ghost}>취소</button>
            <button onClick={saveProfile} style={UIS.primary}>저장</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// 헤더(그룹) + 하위메뉴 렌더 — 하위는 해당 그룹 경로에 있을 때만 펼침
function renderItems(items: MenuItem[], best: string) {
  const out: React.ReactNode[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.header) {
      const children: MenuItem[] = [];
      let j = i + 1;
      while (j < items.length && items[j].child) { children.push(items[j]); j++; }
      const expanded = true;   // 하위 그룹(프로젝트 관리)은 기본 펼침
      out.push(
        <Link key={it.label} href={it.path || "#"} style={{ ...S.item, fontWeight: 600, color: "#374151" }}>
          <span style={S.itemIcon}>{it.icon}</span>
          <span style={{ flex: 1 }}>{it.label}</span>
          <span style={{ fontSize: 10, color: "#c0c6d0" }}>{expanded ? "▾" : "▸"}</span>
        </Link>
      );
      if (expanded) {
        for (const c of children) {
          const active = c.path === best;
          out.push(
            <Link key={c.path} href={c.path} style={{ ...S.item, ...S.itemChild, ...(active ? S.itemActive : {}) }}>
              <span style={{ flex: 1 }}>{c.label}</span>
              {!c.ready && <span style={S.soon}>예정</span>}
            </Link>
          );
        }
      }
      i = j - 1;
    } else {
      const active = it.path === best;
      out.push(
        <Link key={it.path} href={it.path} style={{ ...S.item, ...(active ? S.itemActive : {}) }}>
          <span style={S.itemIcon}>{it.icon}</span>
          <span style={{ flex: 1 }}>{it.label}</span>
          {!it.ready && <span style={S.soon}>예정</span>}
        </Link>
      );
    }
  }
  return out;
}

// 팔레트(아이글 참조): 화이트 사이드바 + 블루 액티브
const SIDEBAR_W = 236;
const RAIL_W = 56;
const BLUE = "#5f8ff0";
const S: Record<string, React.CSSProperties> = {
  sidebar: {
    width: SIDEBAR_W, position: "fixed", top: 0, left: 0, bottom: 0,
    background: "#fff", color: "#4b5563", borderRight: "1px solid #eef0f4",
    display: "flex", flexDirection: "column",
  },
  brand: { display: "flex", alignItems: "center", gap: 10, padding: "18px 16px 14px", borderBottom: "1px solid #eef0f4" },
  collapseBtn: { background: "none", border: 0, color: "#9ca3af", fontSize: 18, cursor: "pointer", padding: "2px 4px", lineHeight: 1 },
  rail: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "18px 0" },
  railLogo: { background: "none", border: 0, cursor: "pointer", padding: 0 },
  railExpand: { background: "#eff5ff", border: "1px solid #dbe6fb", borderRadius: 8, color: "#5f8ff0", cursor: "pointer", fontSize: 14, width: 32, height: 26, lineHeight: 1 },
  brandMark: {
    width: 34, height: 34, borderRadius: 9, background: BLUE, color: "#fff",
    display: "grid", placeItems: "center", fontWeight: 900, fontSize: 18,
  },
  groupLabel: { fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, padding: "10px 12px 4px", fontWeight: 700 },
  item: {
    display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", margin: "1px 0",
    borderRadius: 9, color: "#4b5563", textDecoration: "none", fontSize: 13.5,
  },
  parentHead: { display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", margin: "1px 0", fontSize: 13.5, color: "#374151", fontWeight: 600 },
  itemChild: { marginLeft: 26, paddingLeft: 12, fontSize: 13, color: "#6b7280", borderLeft: "1.5px solid #eef0f4" },
  itemActive: { background: BLUE, color: "#fff", fontWeight: 700, boxShadow: "0 4px 12px rgba(95,143,240,.28)" },
  itemIcon: { width: 18, textAlign: "center", fontSize: 14 },
  soon: { fontSize: 9, background: "#f1f5f9", color: "#94a3b8", borderRadius: 5, padding: "1px 5px" },
  upsell: { margin: 12, padding: "12px 14px", background: "#eff5ff", borderRadius: 10, fontSize: 12, fontWeight: 600, color: "#1e40af" },
  topbar: {
    position: "sticky", top: 0, zIndex: 5, height: 60, background: "#fff",
    borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 12, padding: "0 22px",
  },
  search: {
    display: "flex", alignItems: "center", gap: 6, background: "#f3f4f6", borderRadius: 20,
    padding: "8px 14px", fontSize: 12.5, minWidth: 240,
  },
  iconBtn: { width: 36, height: 36, borderRadius: 10, background: "#f3f4f6", display: "grid", placeItems: "center", cursor: "pointer" },
  user: { display: "flex", alignItems: "center", gap: 8 },
  userMenu: { position: "absolute", right: 0, top: 46, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, boxShadow: "0 12px 32px rgba(15,23,42,.16)", minWidth: 150, padding: 6, zIndex: 30 },
  menuItem: { display: "block", width: "100%", textAlign: "left", background: "none", border: 0, cursor: "pointer", padding: "8px 10px", fontSize: 13, borderRadius: 8, color: "#374151" },
  avatar: { width: 32, height: 32, borderRadius: "50%", background: BLUE, color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13 },
};
