"use client";

// 코드 관리 정보 ▸ 티켓 정보 — App Key · N Key · 서비스 티켓이 각각 무엇에 쓰이는지 `PC-245` `PC-246`
// - 용도 표는 운영 정책 §6.4 · TKT-01 / TKT-02 PRD 기능 개요와 같은 내용
// - N Key 프로필별 Section 표는 발급 화면이 쓰는 값(lib/nkeyFile NKEY_SECTIONS)을 그대로 보인다
import Link from "next/link";
import { S } from "./ui";
import { NKEY_SECTIONS, NKEY_TYPES } from "@/lib/nkeyFile";

type Row = { k: string; app: React.ReactNode; n: React.ReactNode; svc: React.ReactNode };

const ROWS: Row[] = [
  { k: "쓰는 곳 · 쓰는 사람",
    app: <><b>Ncode SDK</b> 를 쓰는 고객사 · <b>Caster U</b> 를 쓰는 고객</>,
    n: <><b>Caster Lite</b>(오프라인 편집툴) 사용자 · <b>CasterN 을 오프라인</b>으로 쓰는 경우(HYBRID)</>,
    svc: <><b>casterN · 폼솔루션</b> 온라인 서비스를 쓰는 고객사</> },
  { k: "형태",
    app: "계정 + App Key(영문 소문자 · 숫자 29자) + 계정 소속 티켓",
    n: <>파일 키 <code>.nkey</code>(Key=Value 텍스트) · Book 2권 이상이면 Book 마다 .nkey 를 묶은 <code>.zip</code></>,
    svc: "키가 아니다 — 고객사 계정과 매칭해 서비스 사용을 승인하는 기준" },
  { k: "계정",
    app: <><b>필요</b> — 계정을 만들면 App Key 자동 생성(계정당 1개) · 티켓은 App Key 가 아니라 <b>계정에</b> 여러 개</>,
    n: "필요 없음",
    svc: "고객사의 서비스 계정과 매칭(주인 = 고객사, 소속 사용자 전원이 공유)" },
  { k: "권한 · 설정",
    app: <>[권한] 탭의 <b>Caster U 권한 20항목</b>(true / false) — 설정해 발급하면 그 계정으로 Caster U 를 쓴다</>,
    n: <>프로필 (Ticket Version) <b>1 LEGACY</b>(Caster Lite) / <b>2 HYBRID</b>(CasterN 오프라인 · CasterN 권한 6개 · Page 볼륨 8의 배수) · 코드 재사용 (Ticket Type) Unlimited / Single — <b>코드 재사용은 N Key 에만</b></>,
    svc: "서비스 구분 casterN / 폼솔루션 — 티켓 하나에 서비스 하나" },
  { k: "기간",
    app: "티켓마다 사용기간(시작 ~ 끝 / 무제한)",
    n: "Issued Time(발급일) · Valid Until Time(기본 무제한)",
    svc: "티켓마다 사용기간 — 끝나면 편집 · 추가 작업 불가, 이미 만든 PDF 인쇄는 막을 수 없음" },
  { k: "정산",
    app: "티켓마다 미정 · 유료 · 무료 · 체험 + 고객사별 연간 라이선스 비용",
    n: "티켓마다 미정 · 유료 · 무료 · 체험 + 고객사별 연간 라이선스 비용",
    svc: "티켓마다 미정 · 유료 · 무료 · 체험" },
  { k: "발급 · 지정 화면",
    app: <Link href="/tickets/account" style={{ color: "#2563eb" }}>티켓 발급 ▸ App Key 관리</Link>,
    n: <Link href="/tickets/nkey" style={{ color: "#2563eb" }}>티켓 발급 ▸ N Key 관리</Link>,
    svc: <Link href="/companies" style={{ color: "#2563eb" }}>고객사 관리 ▸ 서비스 티켓</Link> },
];

export default function TicketInfoView() {
  return (
    <div style={{ maxWidth: 1100, display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>
        고객사가 코드를 직접 쓸 때 주는 티켓은 세 가지입니다. 무엇을 쓰는 고객인지에 따라 고릅니다. <b>사내 편집에는 티켓이 필요 없습니다.</b>
      </p>

      {/* 세 티켓 비교 */}
      <div style={{ ...S.card, padding: 0, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ ...hdr, width: 130 }}>구분</th>
              <th style={hdr}><span style={tag("#f5f3ff", "#6d28d9")}>App Key</span></th>
              <th style={hdr}><span style={tag("#eef6ff", "#1d4ed8")}>N Key</span></th>
              <th style={hdr}><span style={tag("#ecfdf5", "#047857")}>서비스 티켓</span></th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r, i) => (
              <tr key={r.k} style={{ background: i % 2 ? "#fafbfc" : "#fff" }}>
                <td style={{ ...cell, color: "#374151", fontWeight: 700 }}>{r.k}</td>
                <td style={cell}>{r.app}</td>
                <td style={cell}>{r.n}</td>
                <td style={cell}>{r.svc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* App Key · 계정 · 티켓 관계 — 티켓은 App Key 가 아니라 계정에 붙는다 `PC-206` `PC-210` `PC-247` */}
      <div style={{ ...S.card, padding: "14px 16px" }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>App Key — 고객사 · 계정 · App Key · 티켓 관계</div>
        <div style={{ display: "flex", alignItems: "stretch", gap: 10, flexWrap: "wrap", fontSize: 12.5 }}>
          <div style={rel("#f3f4f6", "#374151")}><b>고객사</b><span>계정을 여러 개 가질 수 있다</span></div>
          <div style={arrow}>→</div>
          <div style={rel("#f5f3ff", "#6d28d9")}><b>계정</b><span>고객사 안에 여러 개</span></div>
          <div style={arrow}>→</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={rel("#eef6ff", "#1d4ed8")}><b>App Key 1개</b><span>계정을 만들면 자동 생성 · 계정당 1개</span></div>
            <div style={rel("#ecfdf5", "#047857")}><b>티켓 여러 개</b><span>계정에 붙는다 · SOBP 가 바뀌면 티켓을 더 발급</span></div>
          </div>
        </div>
        <ul style={{ margin: "12px 0 0", paddingLeft: 18, fontSize: 13, color: "#374151", lineHeight: 1.9 }}>
          <li>App Key 는 <b>고객사의 계정마다 1개만</b> 만들어진다 — 계정을 만들 때 자동으로 생긴다.</li>
          <li>티켓은 <b>App Key 에 매칭되지 않고 계정에 매칭</b>된다 — 한 계정에 티켓(Code Type · Section · Owner · Book · Page · Info · Period)을 <b>여러 개</b> 발급할 수 있다.</li>
          <li>그래서 쓰는 코드(SOBP)가 늘거나 바뀌어도 <b>App Key 는 그대로</b> 두고 그 계정에 티켓만 더 발급한다. 정산도 티켓마다 한다.</li>
          <li style={{ color: "#6b7280" }}>이전 정책으로 App Key 가 2개 만들어진 옛 계정은 기록대로 둘 다 보이지만, 새 키는 만들지 않는다.</li>
        </ul>
      </div>

      {/* 고르는 법 */}
      <div style={{ ...S.card, padding: "14px 16px" }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>어떤 티켓을 주나</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#374151", lineHeight: 1.9 }}>
          <li>앱 · 서비스에 <b>Ncode SDK</b> 를 넣는 고객사 → <b>App Key</b></li>
          <li><b>Caster U</b> 를 쓰는 고객 → 계정을 만들고(App Key 자동) [권한] 탭에서 <b>Caster U 권한</b>을 켠 <b>App Key</b></li>
          <li>오프라인 <b>Caster Lite</b> 로 편집하는 고객 → <b>N Key</b>(프로필 LEGACY)</li>
          <li><b>CasterN 을 오프라인</b>으로 쓰는 고객 → <b>N Key</b>(프로필 HYBRID · CasterN 권한 6개)</li>
          <li><b>casterN · 폼솔루션</b> 온라인 서비스를 쓰는 고객사 → 고객사 관리에서 <b>서비스 티켓</b> 지정</li>
        </ul>
      </div>

      {/* N Key 프로필 · 코드 타입별 Section — 발급 화면과 같은 값 */}
      <div style={{ ...S.card, padding: "14px 16px" }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>N Key — 프로필 · 코드 타입별 쓸 수 있는 Section</div>
        <table style={{ borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ ...hdr, textAlign: "left" }}>프로필</th>
              {NKEY_TYPES.map((t) => <th key={t} style={hdr}>{t}</th>)}
            </tr>
          </thead>
          <tbody>
            {(Object.keys(NKEY_SECTIONS) as (keyof typeof NKEY_SECTIONS)[]).map((p) => (
              <tr key={p}>
                <td style={{ ...cell, fontWeight: 700 }}>{p} <span style={{ fontWeight: 400, color: "#6b7280" }}>{p === "LEGACY" ? "(Caster Lite)" : "(CasterN 오프라인)"}</span></td>
                {NKEY_TYPES.map((t) => <td key={t} style={{ ...cell, fontFamily: "ui-monospace,monospace", textAlign: "center" }}>S {NKEY_SECTIONS[p][t].join(" · ")}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8, lineHeight: 1.8 }}>
          표에 없는 Section 은 제한이 없습니다. 새로 발급하는 Code Type 은 PDS2 · PDS3 만입니다(OID · PDS4 는 새로 발급하지 않음).
        </div>
      </div>

      {/* 세 티켓 공통 규칙 */}
      <div style={{ border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 10, padding: "14px 16px", fontSize: 12.5, color: "#1e3a8a", lineHeight: 1.9 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>세 티켓 공통</div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>고객사에 <b>할당된 SOBP 안에서만</b> 발급 · 지정합니다.</li>
          <li>App Key · N Key · 서비스 티켓은 <b>SOBP 가 겹칠 수 없습니다</b> — 고객사를 가리지 않고 전체 발급분과 비교합니다.</li>
          <li>발급한 티켓은 <b>지우지 않고 고칩니다</b>([티켓 수정]).</li>
          <li>SOBP 할당에는 기간이 없고(한 번 할당받은 고객사가 영구 소유), <b>사용기간은 티켓에만</b> 있습니다.</li>
        </ul>
      </div>
    </div>
  );
}

const hdr: React.CSSProperties = { textAlign: "center", padding: "9px 12px", background: "#eef0f4", color: "#374151", fontWeight: 700, fontSize: 12, borderBottom: "1px solid #e5e7eb" };
const cell: React.CSSProperties = { padding: "9px 12px", verticalAlign: "top", borderTop: "1px solid #f1f3f6", lineHeight: 1.7 };
const rel = (bg: string, fg: string): React.CSSProperties => ({ display: "flex", flexDirection: "column", gap: 2, background: bg, color: fg, borderRadius: 9, padding: "9px 12px", minWidth: 150 });
const arrow: React.CSSProperties = { display: "flex", alignItems: "center", color: "#9ca3af", fontSize: 16 };
const tag = (bg: string, fg: string): React.CSSProperties => ({ ...S.tag, background: bg, color: fg, fontWeight: 700, fontSize: 12 });
