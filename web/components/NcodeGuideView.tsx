import { S } from "./ui";

const th: React.CSSProperties = { ...S.th, textAlign: "left" };
const td: React.CSSProperties = { ...S.td, borderTop: "1px solid #eef0f4" };

export default function NcodeGuideView({ embedded }: { embedded?: boolean } = {}) {
  return (
    <div style={{ padding: embedded ? 0 : "20px 22px", maxWidth: 1000 }}>
      <p style={{ margin: "0 0 16px", color: "#6b7280", fontSize: 13 }}>
        코드 발급·편집 운영에서 반드시 알아야 할 기준. (한윤정 책임 협의 정리)
      </p>

      {/* 1. 편집 비용 산출 */}
      <Section n="1" title="편집 비용 산출 기준 — 페이지 + 심볼">
        <ul style={ul}>
          <li>소리펜·필기펜 <b>모두 「페이지 수 + 심볼 갯수」로 편집 비용을 산출</b>합니다.</li>
          <li><b>심볼</b> = 편집(nproj)에서 (책) 영역을 설정한 편집 단위. 이 심볼에 리소스(mp3)를 매핑합니다. <b>심볼 갯수 = 작업량</b>.</li>
          <li>필기펜 <b>nproj</b>는 심볼 갯수가 늘수록 서버 저장 용량도 증가 → 필기펜도 심볼 갯수 파악이 현황 확인에 도움.</li>
          <li>재무팀은 이미 <b>편집 단가 협상 미팅을 완료</b>해 산출 기준을 알고 있습니다.</li>
        </ul>
      </Section>

      {/* 2. 산출물 · 저장 위치 */}
      <Section n="2" title="산출물 · 저장 위치">
        <table style={{ ...S.table }}>
          <thead><tr>{["항목", "종류", "저장 위치"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            <tr><td style={{ ...td, fontWeight: 600 }}>리소스 파일 (mp3 등)</td><td style={td}>소리펜·필기펜 공통</td><td style={{ ...td, color: "#2563eb" }}>디바이스에 저장 (서버 스토리지 ✕)</td></tr>
            <tr><td style={{ ...td, fontWeight: 600 }}>ncp2</td><td style={td}>소리펜 산출물 (좌표+mp3)</td><td style={{ ...td, color: "#2563eb" }}>디바이스(소리펜)에 넣어야 동작</td></tr>
            <tr><td style={{ ...td, fontWeight: 600 }}>nproj + PDF + JPG + 썸네일 png</td><td style={td}>필기펜 편집 파일</td><td style={{ ...td, color: "#047857" }}>서버에 등록</td></tr>
          </tbody>
        </table>
        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>편집은 소리·필기 모두 「심볼 ↔ 리소스 매핑」에서 작업이 발생하므로 심볼 갯수로 작업량을 산출하는 것이 맞습니다.</p>
      </Section>

      {/* 3. 코드 구분 */}
      <Section n="3" title="코드 구분 (PDS)">
        <ul style={ul}>
          <li><b>PDS3 (N3C6) = Ncode</b> — N3C6의 N.</li>
          <li><b>PDS2 (G3C6) = Gcode</b> — G3C6의 G.</li>
        </ul>
      </Section>

      {/* 4. 코드 발급 현황 */}
      <Section n="4" title="코드 발급 현황 — 재무·사업부용">
        <ul style={ul}>
          <li>발급 코드 <b>합계는 편집에는 사용하지 않습니다.</b> B2B 납품 관점에서도 합계 필요성은 낮았습니다.</li>
          <li>그러나 이제 <b>사업부·재무팀이 코드 발급 현황을 조회</b>합니다 → <b>"코드가 얼마나 발급되었는지"</b> 확인 용도로 발급 규모를 봅니다.</li>
          <li><b>코드 라이선스 비용은 사업팀에서 별도 책정</b>합니다(편집 단가와 별개). 편집 단가는 재무팀이 이미 인지.</li>
        </ul>
      </Section>

      {/* 5. 실제 견적 단가 */}
      <Section n="5" title="실제 산출 단가 (견적서 기준)">
        <table style={{ ...S.table }}>
          <thead><tr>{["구분", "단위", "단가", "비고"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            <tr><td style={{ ...td, fontWeight: 600 }}>Ncode 적용</td><td style={td}>페이지당</td><td style={{ ...td, fontFamily: "ui-monospace,monospace" }}>500원</td><td style={td}>인쇄데이터에 Ncode 적용</td></tr>
            <tr><td style={{ ...td, fontWeight: 600 }}>Ncode 편집</td><td style={td}>심볼당</td><td style={{ ...td, fontFamily: "ui-monospace,monospace" }}>1,000 ~ 1,500원</td><td style={td}>난도(기능)에 따라 차등</td></tr>
            <tr><td style={{ ...td, fontWeight: 600 }}>노트서버 업로드</td><td style={td}>건당</td><td style={{ ...td, fontFamily: "ui-monospace,monospace" }}>10,000원</td><td style={td}>필기펜 nproj 서버 등록</td></tr>
          </tbody>
        </table>
        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>예: 2026-07-16 양지사 플래너 4종 견적 = 적용(페이지) + 편집(심볼) + 업로드 합산 ₩35,232,000(VAT 별도).</p>
      </Section>

      {/* 결론 */}
      <div style={{ ...S.card, padding: "14px 16px", background: "#eff6ff", border: "1px solid #bfdbfe", fontSize: 13, color: "#1e3a8a", lineHeight: 1.8 }}>
        <b>정리</b> — 리소스(mp3)는 소리·필기 모두 디바이스 저장, 필기펜 편집 파일(nproj+PDF+JPG+png)만 서버 등록.
        편집은 심볼↔리소스 매핑에서 발생하므로 <b>페이지와 심볼 갯수로 작업량·비용을 산출</b>합니다.
        코드 발급 규모는 재무·사업부 현황 파악용이며, 코드 라이선스 비용은 사업팀이 별도 책정합니다.
      </div>
    </div>
  );
}

const ul: React.CSSProperties = { margin: 0, paddingLeft: 18, fontSize: 13, color: "#374151", lineHeight: 1.9 };

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ ...S.card, padding: 16, marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ background: "#5f8ff0", color: "#fff", borderRadius: 6, width: 22, height: 22, display: "inline-grid", placeItems: "center", fontSize: 12 }}>{n}</span>
        {title}
      </div>
      {children}
    </div>
  );
}
