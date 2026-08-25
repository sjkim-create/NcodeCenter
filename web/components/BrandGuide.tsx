/* eslint-disable @next/next/no-img-element */
const PALETTE: { name: string; hex: string; use: string; dark?: boolean }[] = [
  { name: "Primary Blue", hex: "#5f8ff0", use: "브랜드 · 액티브 · 링크", dark: true },
  { name: "Cyan (gradient)", hex: "#7bcdf1", use: "로고 그라데이션" },
  { name: "Ink / Text", hex: "#1f2937", use: "제목·본문", dark: true },
  { name: "Success", hex: "#8ec674", use: "할당됨 · 성공", dark: true },
  { name: "Warning", hex: "#f2b350", use: "주의 · 강조" },
  { name: "Danger", hex: "#ef7d74", use: "삭제·경고", dark: true },
  { name: "Info", hex: "#5cb4e6", use: "보조 정보" },
  { name: "Line", hex: "#e5e7eb", use: "테두리" },
  { name: "Surface", hex: "#f6f7f9", use: "배경" },
];

export default function BrandGuide() {
  return (
    <div style={{ padding: "22px", maxWidth: 940 }}>
      <h1 style={{ fontSize: 20, margin: 0 }}>NcodeCenter — 브랜드 아이덴티티 (CI)</h1>
      <p style={{ color: "#6b7280", fontSize: 13.5, marginTop: 6 }}>
        컨셉: <b>Ncode</b>(점 패턴 코드) + <b>Center</b>(중심점). 기하학적 <b>N</b> + 대각선 위 중심 점.
팔레트는 <b>맑고 은은한 톤</b>(쨍하지 않게) 기반. 로고 중심점은 연한 회색.
      </p>

      {/* 로고 */}
      <Section title="로고">
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <LogoTile bg="#fff" border><img src="/logo.svg" alt="NcodeCenter" height={40} /></LogoTile>
          <LogoTile bg="#0f172a"><img src="/logo-mark.svg" alt="mark" height={44} /><span style={{ color: "#fff", fontWeight: 600, fontSize: 20, marginLeft: 12 }}>Ncode<span style={{ color: "#60a5fa" }}>Center</span></span></LogoTile>
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
          {[28, 40, 56, 72].map((s) => (
            <div key={s} style={{ textAlign: "center" }}>
              <img src="/logo-mark.svg" alt="mark" width={s} height={s} />
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{s}px</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 10 }}>
          파일: <a href="/logo-mark.svg" style={A}>logo-mark.svg</a> · <a href="/logo.svg" style={A}>logo.svg</a>
        </div>
      </Section>

      {/* 컬러 */}
      <Section title="컬러 팔레트">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>
          {PALETTE.map((c) => (
            <div key={c.hex} style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ height: 58, background: c.hex, color: c.dark ? "#fff" : "#111827", display: "flex", alignItems: "flex-end", padding: 8, fontSize: 12, fontWeight: 700 }}>{c.hex}</div>
              <div style={{ padding: "7px 9px" }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>{c.use}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 타이포/사용 */}
      <Section title="타이포 · 사용 규칙">
        <ul style={{ margin: 0, paddingLeft: 18, color: "#374151", fontSize: 13.5, lineHeight: 2 }}>
          <li>서체: 시스템 산세리프(Segoe UI / Malgun Gothic), 제목 800 / 본문 400</li>
          <li>워드마크: <b style={{ fontWeight: 600 }}>Ncode</b>(잉크) + <b style={{ color: "#5f8ff0", fontWeight: 600 }}>Center</b>(블루) — Semibold(600, 두껍지 않게) · 색 분리 유지</li>
          <li>마크 최소 크기 20px, 여백은 마크 높이의 25% 이상 확보</li>
          <li>배경 대비 부족 시 화이트/네이비 배경에만 사용, 색 왜곡 금지</li>
        </ul>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 18px", marginTop: 16 }}>
      <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}
function LogoTile({ bg, border, children }: { bg: string; border?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", background: bg, border: border ? "1px solid #e5e7eb" : "none", borderRadius: 12, padding: "18px 24px", minWidth: 220 }}>
      {children}
    </div>
  );
}
const A: React.CSSProperties = { color: "#5f8ff0", textDecoration: "none" };
